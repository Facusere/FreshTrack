import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  Heart,
  Plus,
  Minus,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LocalRecipe, RecipeMatchResult } from "@/lib/localRecipesMatching";
import { getRecipeFallbackImage } from "@/lib/recipeApi";
import { scaleMeasure } from "@/lib/weeklyShopping";
import { isNonNumericSpice } from "@/lib/inventoryConsumption";
import { Product } from "@/types/product";
import { findBestMatchingItem } from "@/lib/ingredientMatching";
import { daysUntil, todayISO, addDaysISO } from "@/lib/dates";
import { MealSlot } from "@/lib/mealPlan";
import { toast } from "sonner";
import { playChimeSound, triggerHaptic } from "@/lib/feedback";
import {
  loadCustomRecipePhotos,
  saveCustomRecipePhoto,
  removeCustomRecipePhoto,
  compressRecipeImage,
  RECIPE_PHOTO_CHANGED_EVENT,
} from "@/lib/recipeCustomImages";

export interface RecipeDetailDialogProps {
  recipe: LocalRecipe | null;
  isOpen: boolean;
  onClose: () => void;
  matchResult?: RecipeMatchResult;
  isFavorite?: boolean;
  onToggleFavorite?: (recipeId: string) => void;
  onAddMissingToShopping?: (
    recipeTitle: string,
    missing: Array<{ name: string; quantity?: string }>
  ) => void;
  onCookRecipe?: (recipe: LocalRecipe, portions: number) => void;
  onPlanMeal?: (
    recipe: LocalRecipe,
    date: string,
    slot: MealSlot,
    portions: number
  ) => void;
  pantry?: Product[];
  onNavigateToShopping?: () => void;
}

export function RecipeDetailDialog({
  recipe,
  isOpen,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  onAddMissingToShopping,
  onCookRecipe,
  onPlanMeal,
  pantry = [],
  onNavigateToShopping,
}: RecipeDetailDialogProps) {
  const [portions, setPortions] = useState<number>(2);
  const [showPlannerPicker, setShowPlannerPicker] = useState(false);
  const [planDate, setPlanDate] = useState<string>(() => todayISO());
  const [planSlot, setPlanSlot] = useState<MealSlot>("almuerzo");

  // Custom photo memory state
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (recipe) {
      const photos = loadCustomRecipePhotos();
      setCustomPhoto(photos[recipe.id] || null);
    }
  }, [recipe?.id]);

  useEffect(() => {
    const handlePhotoChanged = (e: any) => {
      if (recipe && e.detail?.recipeId === recipe.id) {
        setCustomPhoto(e.detail.photoDataUrl || null);
      }
    };
    window.addEventListener(RECIPE_PHOTO_CHANGED_EVENT, handlePhotoChanged);
    return () => window.removeEventListener(RECIPE_PHOTO_CHANGED_EVENT, handlePhotoChanged);
  }, [recipe?.id]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recipe) return;

    try {
      setIsUploadingPhoto(true);
      triggerHaptic();
      const compressed = await compressRecipeImage(file, 1000, 0.82);
      saveCustomRecipePhoto(recipe.id, compressed);
      setCustomPhoto(compressed);
      playChimeSound("success");
      toast.success("¡Foto de tu plato guardada!", {
        description: `Guardamos el recuerdo de tu preparación para “${recipe.name}”.`,
      });
    } catch (err) {
      console.error("Error saving recipe photo:", err);
      toast.error("No se pudo guardar la foto del plato.");
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recipe) return;
    removeCustomRecipePhoto(recipe.id);
    setCustomPhoto(null);
    playChimeSound("pop");
    triggerHaptic();
    toast.info("Foto original restablecida", {
      description: "Se volvió a la foto de portada predeterminada del recetario.",
    });
  };

  if (!recipe) return null;

  const factor = portions / 2;

  // Analizar estado de cada ingrediente contra la despensa
  const ingredientStatuses = recipe.ingredients.map((ing) => {
    const matchedPantryItem = findBestMatchingItem(pantry, { name: ing.name });
    const isExpired =
      matchedPantryItem &&
      (matchedPantryItem.status === "expired" ||
        (matchedPantryItem.expiryDate && daysUntil(matchedPantryItem.expiryDate) < 0));

    const isAvailable = Boolean(matchedPantryItem) && !isExpired;
    const isSpice = isNonNumericSpice(ing.quantity || "");

    const scaledQuantity = scaleMeasure(ing.quantity || "1 unidad", factor);

    return {
      name: ing.name,
      originalQuantity: ing.quantity,
      scaledQuantity,
      isAvailable,
      isExpired,
      isSpice,
      matchedItem: matchedPantryItem,
    };
  });

  const missingList = ingredientStatuses
    .filter((ing) => !ing.isAvailable && !ing.isSpice)
    .map((ing) => ({
      name: ing.name,
      quantity: ing.scaledQuantity,
    }));

  const expiredInPantryCount = ingredientStatuses.filter((ing) => ing.isExpired).length;

  const handleAddMissing = () => {
    if (!onAddMissingToShopping) return;
    if (missingList.length === 0) {
      toast.info("¡Tenés todos los ingredientes en tu despensa!");
      return;
    }

    onAddMissingToShopping(recipe.name, missingList);

    toast.success(`Agregamos ${missingList.length} ingredientes a tu lista`, {
      description: `Cantidades adaptadas para ${portions} ${
        portions === 1 ? "porción" : "porciones"
      }.`,
      action: onNavigateToShopping
        ? {
            label: "Ver lista",
            onClick: onNavigateToShopping,
          }
        : undefined,
    });
  };

  const handleCook = () => {
    onCookRecipe?.(recipe, portions);
    onClose();
  };

  const handleConfirmPlan = () => {
    onPlanMeal?.(recipe, planDate, planSlot, portions);
    setShowPlannerPicker(false);
    toast.success(`Receta asignada al ${planSlot}`, {
      description: `Guardamos “${recipe.name}” para el ${planDate} (${portions} porciones).`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[620px] p-0 border border-line bg-surface rounded-[24px]">
        {/* Input oculto para subir foto del plato preparado */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
          aria-hidden="true"
        />

        <DialogHeader className="sr-only">
          <DialogTitle>{recipe.name}</DialogTitle>
          <DialogDescription>{recipe.category}</DialogDescription>
        </DialogHeader>

        {/* Header Image con botones de personalización */}
        <div className="relative h-52 sm:h-64 w-full bg-surface-muted overflow-hidden">
          <img
            src={customPhoto || recipe.image || getRecipeFallbackImage(recipe.name, recipe.category)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getRecipeFallbackImage(
                recipe.name,
                recipe.category
              );
            }}
            alt={recipe.name}
            className="h-full w-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

          {/* Insignia superior izquierda: Si tiene foto propia */}
          <div className="absolute top-3.5 left-4 flex items-center gap-2 z-10">
            {customPhoto && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-600/95 text-white text-[11px] font-bold px-3 py-1 backdrop-blur-md shadow-md border border-white/30 animate-in fade-in duration-300">
                <Sparkles size={13} className="text-emerald-200" />
                <span>Tu recuerdo de cocina</span>
              </div>
            )}
          </div>

          {/* Top Actions: Favorito y Cerrar */}
          <div className="absolute top-3.5 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              role="button"
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Quitar de favoritas" : "Agregar a favoritas"}
              onClick={() => onToggleFavorite?.(recipe.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition cursor-pointer ${
                isFavorite
                  ? "bg-rose-500 text-white shadow-md ring-2 ring-white/50"
                  : "bg-surface/80 text-content-body hover:bg-surface hover:text-rose-500"
              }`}
            >
              <Heart
                size={17}
                className={isFavorite ? "fill-current" : ""}
                strokeWidth={2.4}
              />
            </button>

            <button
              type="button"
              aria-label="Cerrar detalle de receta"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-content-body backdrop-blur-md hover:bg-surface cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          {/* Pie de foto: Título, categoría y botón para subir/cambiar foto */}
          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white z-10">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                {recipe.category}
              </span>
              <h3 className="mt-0.5 font-display text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                {recipe.name}
              </h3>
            </div>

            {/* Acciones de foto de recuerdo */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isUploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 backdrop-blur-md border border-white/30 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                title="Subí una foto de cuando cocinaste este plato para guardarla como recuerdo"
              >
                <Camera size={13} />
                <span>{customPhoto ? "Cambiar mi foto" : "Subir mi foto"}</span>
              </button>

              {customPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/40 hover:bg-rose-900/60 text-white/90 hover:text-white backdrop-blur-md border border-white/20 shadow-xs transition cursor-pointer"
                  title="Restaurar foto de portada original"
                  aria-label="Restaurar foto original"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Expired warning if pantry contains expired ingredient */}
          {expiredInPantryCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-status-expired-border bg-status-expired-bg p-3.5 text-xs text-status-expired-text">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Tenés ingredientes de esta receta que vencieron en tu despensa. Están marcados como
                faltantes para que puedas reponerlos frescos.
              </span>
            </div>
          )}

          {/* Portions Bar */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                Porciones a preparar
              </p>
              <p className="text-xs text-content-body mt-0.5">
                Las cantidades se adaptan automáticamente
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-subtle px-2.5 py-1">
              <button
                type="button"
                aria-label="Menos porciones"
                onClick={() => setPortions((p) => Math.max(1, p - 1))}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface text-content hover:bg-surface-elevated font-bold text-xs transition"
              >
                <Minus size={13} />
              </button>
              <span className="font-bold text-brand min-w-[20px] text-center text-sm">
                {portions}
              </span>
              <button
                type="button"
                aria-label="Más porciones"
                onClick={() => setPortions((p) => Math.min(12, p + 1))}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface text-content hover:bg-surface-elevated font-bold text-xs transition"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Ingredients list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display text-sm font-bold text-content-heading">
                Ingredientes necesarios
              </h4>
              <span className="text-xs text-content-muted">
                {ingredientStatuses.filter((i) => i.isAvailable).length} de{" "}
                {recipe.ingredients.length} en despensa
              </span>
            </div>

            <div className="space-y-2">
              {ingredientStatuses.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line-subtle bg-surface-subtle/50 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {item.isAvailable ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-status-ok-bg text-status-ok-text border border-status-ok-border">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-status-expired-bg text-status-expired-text border border-status-expired-border">
                        <X size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span className="font-semibold text-content-heading">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-content-body">{item.scaledQuantity}</span>
                    {item.isExpired ? (
                      <span className="rounded-md bg-status-expired-bg border border-status-expired-border px-1.5 py-0.5 text-[10px] font-bold text-status-expired-text">
                        Vencido
                      </span>
                    ) : item.isAvailable ? (
                      <span className="rounded-md bg-status-ok-bg border border-status-ok-border px-1.5 py-0.5 text-[10px] font-bold text-status-ok-text">
                        En despensa
                      </span>
                    ) : (
                      <span className="rounded-md bg-status-expired-bg border border-status-expired-border px-1.5 py-0.5 text-[10px] font-bold text-status-expired-text">
                        Falta
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Step-by-Step */}
          <div>
            <h4 className="font-display text-sm font-bold text-content-heading mb-3">
              Paso a paso
            </h4>
            <div className="space-y-2.5">
              {recipe.instructions.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand-text">
                    {idx + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-content-body">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Planner Selector Collapse */}
          {showPlannerPicker && (
            <div className="rounded-2xl border border-brand-border bg-brand-subtle/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                  <Calendar size={14} /> Asignar a la semana
                </span>
                <button
                  type="button"
                  onClick={() => setShowPlannerPicker(false)}
                  className="text-xs text-content-muted hover:text-content-heading"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-content-muted mb-1">
                    Día
                  </label>
                  <select
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface p-2 font-semibold text-content-heading"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                      const iso = addDaysISO(offset);
                      return (
                        <option key={iso} value={iso}>
                          {offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : `En ${offset} días`} ({iso})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-content-muted mb-1">
                    Franja
                  </label>
                  <select
                    value={planSlot}
                    onChange={(e) => setPlanSlot(e.target.value as MealSlot)}
                    className="w-full rounded-xl border border-line bg-surface p-2 font-semibold text-content-heading"
                  >
                    <option value="almuerzo">Almuerzo</option>
                    <option value="cena">Cena</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmPlan}
                className="w-full min-h-[38px] rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover transition"
              >
                Confirmar en planificador
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-line/60">
            {missingList.length > 0 ? (
              <button
                type="button"
                onClick={handleAddMissing}
                className="w-full sm:flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition focus:outline-none focus:ring-2 focus:ring-brand-focus"
              >
                <ShoppingCart size={15} /> Agregar lo que me falta a la lista ({missingList.length})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCook}
                className="btn-3d-accent w-full sm:flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-accent-lime px-4 py-2.5 text-xs font-bold text-accent-lime-fg"
              >
                <Check size={16} strokeWidth={2.6} /> Cocinar ahora
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPlannerPicker((prev) => !prev)}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-content-heading hover:bg-surface-elevated transition"
            >
              <Calendar size={14} /> Planificar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
