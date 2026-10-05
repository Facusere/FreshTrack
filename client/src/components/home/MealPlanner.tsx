import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  PlannedMeal,
  MealSlot,
  getWeekDaysISO,
  setMealSlot,
  removePlannedMeal,
  checkEarlyExpiryForPlannedMeal,
} from "@/lib/mealPlan";
import { LocalRecipe, LOCAL_RECIPES } from "@/lib/localRecipesMatching";
import { Product } from "@/types/product";
import {
  calculateWeeklyShoppingIngredients,
  addWeeklyItemsToShoppingList,
  WeeklyShoppingPreviewItem,
} from "@/lib/weeklyShopping";
import { ShoppingItem } from "@/lib/shoppingList";
import { todayISO } from "@/lib/dates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface MealPlannerProps {
  mealPlan: PlannedMeal[];
  setMealPlan: (plan: PlannedMeal[]) => void;
  recipes?: LocalRecipe[];
  pantryProducts?: Product[];
  shoppingList?: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  onOpenRecipeDetail?: (recipe: LocalRecipe) => void;
  onNavigateToShopping?: () => void;
}

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function MealPlanner({
  mealPlan,
  setMealPlan,
  recipes = LOCAL_RECIPES,
  pantryProducts = [],
  setShoppingList,
  onOpenRecipeDetail,
  onNavigateToShopping,
}: MealPlannerProps) {
  // Base date for visible week navigation
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Picker modal for assigning a recipe to a slot
  const [slotPicker, setSlotPicker] = useState<{
    date: string;
    slot: MealSlot;
  } | null>(null);

  // Search filter inside recipe picker modal
  const [pickerSearch, setPickerSearch] = useState("");

  // Preview dialog for weekly shopping generator
  const [previewItems, setPreviewItems] = useState<WeeklyShoppingPreviewItem[] | null>(null);

  const recipeMap = useMemo(() => {
    return new Map<string, LocalRecipe>(recipes.map((r) => [r.id, r]));
  }, [recipes]);

  // Week days starting on Monday
  const weekDays = useMemo(() => {
    return getWeekDaysISO(currentDate);
  }, [currentDate]);

  const todayStr = todayISO();

  // Navigation handlers
  const handlePrevWeek = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
  };

  const handleNextWeek = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Assign recipe
  const handleSelectRecipeForSlot = (recipeId: string) => {
    if (!slotPicker) return;
    const updated = setMealSlot(mealPlan, recipeId, slotPicker.date, slotPicker.slot, 2);
    setMealPlan(updated);
    setSlotPicker(null);
    setPickerSearch("");
    const recipe = recipeMap.get(recipeId);
    toast.success(`Receta asignada al ${slotPicker.slot}`, {
      description: `Agregaste “${recipe?.name || "Receta"}” al plan.`,
    });
  };

  // Remove meal
  const handleRemoveMeal = (mealId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removePlannedMeal(mealPlan, mealId);
    setMealPlan(updated);
    toast("Comida eliminada del plan", {
      description: "La franja quedó libre para una nueva preparación.",
    });
  };

  // Generate weekly shopping
  const handleGenerateWeeklyShopping = () => {
    // Filter meals for the currently visible week
    const weekSet = new Set(weekDays);
    const visibleMeals = mealPlan.filter((m) => weekSet.has(m.date));

    if (visibleMeals.length === 0) {
      toast.info("No hay comidas planificadas en esta semana", {
        description: "Asigná recetas a los días para generar la lista de compras.",
      });
      return;
    }

    const calculated = calculateWeeklyShoppingIngredients(
      visibleMeals,
      recipes,
      pantryProducts
    );

    if (calculated.length === 0) {
      toast.success("¡Tenés todo cubierto en tu despensa!", {
        description: "No hace falta comprar nada adicional para esta semana.",
      });
      return;
    }

    setPreviewItems(calculated);
  };

  // Confirm weekly shopping preview
  const handleConfirmWeeklyShopping = () => {
    if (!previewItems) return;
    const selected = previewItems.filter((i) => i.checked);
    if (selected.length === 0) {
      toast.info("No seleccionaste ningún ingrediente para agregar.");
      return;
    }

    setShoppingList((prev) => addWeeklyItemsToShoppingList(prev, selected));
    setPreviewItems(null);

    toast.success(`Agregamos ${selected.length} ingredientes a tu lista de compras`, {
      description: "Cantidades consolidadas y descontadas de tu despensa.",
      action: onNavigateToShopping
        ? {
            label: "Ver lista",
            onClick: onNavigateToShopping,
          }
        : undefined,
    });
  };

  // Format date header (e.g. "Lun 5 oct")
  const formatDayHeader = (iso: string, idx: number) => {
    const [, m, d] = iso.split("-").map(Number);
    const dayName = DAY_NAMES[idx];
    const monthName = MONTH_NAMES[m - 1];
    return { dayName, dateStr: `${d} ${monthName}`, isToday: iso === todayStr };
  };

  // Filtered recipes for picker modal
  const filteredPickerRecipes = useMemo(() => {
    if (!pickerSearch.trim()) return recipes.slice(0, 40);
    const q = pickerSearch.toLowerCase().trim();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [recipes, pickerSearch]);

  return (
    <div className="space-y-4">
      {/* Header bar: Title, Navigation, Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-content-heading flex items-center gap-2">
            <Calendar size={18} className="text-brand" /> Planificador semanal
          </h3>
          <p className="text-xs text-content-muted mt-0.5">
            Organizá tus comidas de lunes a domingo y generá la lista de compras exacta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week navigation buttons */}
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <button
              type="button"
              aria-label="Semana anterior"
              onClick={handlePrevWeek}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-content-muted hover:bg-surface-elevated hover:text-content-heading transition"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={handleCurrentWeek}
              className="px-2.5 py-1 text-xs font-bold text-brand hover:underline"
            >
              Esta semana
            </button>

            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={handleNextWeek}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-content-muted hover:bg-surface-elevated hover:text-content-heading transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerateWeeklyShopping}
            className="btn-3d flex min-h-[38px] items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition"
          >
            <ShoppingCart size={14} /> Generar lista de la semana
          </button>
        </div>
      </div>

      {/* 7 Days Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 overflow-x-auto pb-2">
        {weekDays.map((dateIso, idx) => {
          const { dayName, dateStr, isToday } = formatDayHeader(dateIso, idx);
          const dayMeals = mealPlan.filter((m) => m.date === dateIso);
          const lunchMeal = dayMeals.find((m) => m.slot === "almuerzo");
          const dinnerMeal = dayMeals.find((m) => m.slot === "cena");

          const lunchRecipe = lunchMeal ? recipeMap.get(lunchMeal.recipeId) : undefined;
          const dinnerRecipe = dinnerMeal ? recipeMap.get(dinnerMeal.recipeId) : undefined;

          const lunchEarlyExpiry =
            lunchMeal && lunchRecipe
              ? checkEarlyExpiryForPlannedMeal(lunchMeal, lunchRecipe, pantryProducts)
              : null;

          const dinnerEarlyExpiry =
            dinnerMeal && dinnerRecipe
              ? checkEarlyExpiryForPlannedMeal(dinnerMeal, dinnerRecipe, pantryProducts)
              : null;

          return (
            <div
              key={dateIso}
              className={`rounded-2xl border p-3 flex flex-col justify-between transition ${
                isToday
                  ? "border-brand-border bg-brand-subtle/30 shadow-xs"
                  : "border-line bg-surface"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
                <span className="font-display text-xs font-bold text-content-heading">
                  {dayName}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isToday ? "text-brand font-bold" : "text-content-muted"
                  }`}
                >
                  {dateStr}
                </span>
              </div>

              {/* Slots: Almuerzo & Cena */}
              <div className="mt-3 space-y-2.5 flex-1">
                {/* Almuerzo */}
                <div className="rounded-xl border border-line-subtle bg-surface-subtle/60 p-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1">
                    <span>Almuerzo</span>
                    {lunchRecipe && (
                      <button
                        type="button"
                        aria-label="Quitar almuerzo"
                        onClick={(e) => handleRemoveMeal(lunchMeal!.id, e)}
                        className="text-content-muted hover:text-status-expired-text transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {lunchRecipe ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenRecipeDetail?.(lunchRecipe)}
                        className="text-left font-bold text-content-heading hover:text-brand transition line-clamp-2 leading-tight"
                      >
                        {lunchRecipe.name}
                      </button>
                      <span className="block mt-1 text-[11px] text-content-muted">
                        {lunchMeal?.portions} {lunchMeal?.portions === 1 ? "porción" : "porciones"}
                      </span>

                      {lunchEarlyExpiry?.hasEarlyExpiry && (
                        <div
                          title={lunchEarlyExpiry.expiredItems.join("\n")}
                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-status-expired-text bg-status-expired-bg border border-status-expired-border rounded px-1.5 py-0.5"
                        >
                          <AlertTriangle size={11} className="shrink-0" />
                          <span>Vence antes</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSlotPicker({ date: dateIso, slot: "almuerzo" })}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-content-muted hover:text-brand border border-dashed border-line rounded-lg hover:border-brand-border hover:bg-surface transition"
                    >
                      <Plus size={12} /> Asignar
                    </button>
                  )}
                </div>

                {/* Cena */}
                <div className="rounded-xl border border-line-subtle bg-surface-subtle/60 p-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1">
                    <span>Cena</span>
                    {dinnerRecipe && (
                      <button
                        type="button"
                        aria-label="Quitar cena"
                        onClick={(e) => handleRemoveMeal(dinnerMeal!.id, e)}
                        className="text-content-muted hover:text-status-expired-text transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {dinnerRecipe ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenRecipeDetail?.(dinnerRecipe)}
                        className="text-left font-bold text-content-heading hover:text-brand transition line-clamp-2 leading-tight"
                      >
                        {dinnerRecipe.name}
                      </button>
                      <span className="block mt-1 text-[11px] text-content-muted">
                        {dinnerMeal?.portions} {dinnerMeal?.portions === 1 ? "porción" : "porciones"}
                      </span>

                      {dinnerEarlyExpiry?.hasEarlyExpiry && (
                        <div
                          title={dinnerEarlyExpiry.expiredItems.join("\n")}
                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-status-expired-text bg-status-expired-bg border border-status-expired-border rounded px-1.5 py-0.5"
                        >
                          <AlertTriangle size={11} className="shrink-0" />
                          <span>Vence antes</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSlotPicker({ date: dateIso, slot: "cena" })}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold text-content-muted hover:text-brand border border-dashed border-line rounded-lg hover:border-brand-border hover:bg-surface transition"
                    >
                      <Plus size={12} /> Asignar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe Picker Modal */}
      {slotPicker && (
        <Dialog open={Boolean(slotPicker)} onOpenChange={(open) => !open && setSlotPicker(null)}>
          <DialogContent className="max-w-[480px] p-5 border border-line bg-surface rounded-[24px]">
            <DialogHeader>
              <DialogTitle>Asignar receta para {slotPicker.slot}</DialogTitle>
              <DialogDescription>
                Día {slotPicker.date}. Elegí una receta de tu recetario:
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3">
              <input
                type="text"
                placeholder="Buscar por nombre o ingrediente..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface-subtle px-3.5 py-2 text-xs font-semibold text-content-heading placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-focus"
              />
            </div>

            <div className="mt-3 max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
              {filteredPickerRecipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRecipeForSlot(r.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-line-subtle bg-surface-subtle/50 hover:bg-surface-elevated hover:border-brand-border transition text-left text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-content-heading truncate">{r.name}</p>
                    <p className="text-[11px] text-content-muted truncate">{r.category}</p>
                  </div>
                  <span className="text-[11px] font-bold text-brand shrink-0">Elegir</span>
                </button>
              ))}
              {filteredPickerRecipes.length === 0 && (
                <p className="text-center py-6 text-xs text-content-muted">
                  No encontramos recetas para esa búsqueda.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Weekly Shopping Preview Modal */}
      {previewItems && (
        <Dialog open={Boolean(previewItems)} onOpenChange={(open) => !open && setPreviewItems(null)}>
          <DialogContent className="max-w-[540px] max-h-[85vh] overflow-y-auto p-5 border border-line bg-surface rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-brand" /> Lista de compras semanal
              </DialogTitle>
              <DialogDescription>
                Consolidamos los ingredientes necesarios y descontamos lo que ya tenés en tu despensa:
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {previewItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-line-subtle bg-surface-subtle/40 p-3 text-xs cursor-pointer hover:bg-surface-elevated transition"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPreviewItems((prev) =>
                        prev
                          ? prev.map((i) => (i.id === item.id ? { ...i, checked } : i))
                          : null
                      );
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand-focus"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-content-heading">{item.name}</span>
                      <span className="font-bold text-brand">{item.quantity}</span>
                    </div>
                    <p className="text-[11px] text-content-muted mt-0.5">
                      Para: {item.recipeNames.join(", ")}
                    </p>
                    {item.inPantryNote && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-status-ok-text bg-status-ok-bg border border-status-ok-border rounded px-1.5 py-0.5">
                        {item.inPantryNote}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-line/60 pt-3">
              <button
                type="button"
                onClick={() => setPreviewItems(null)}
                className="px-4 py-2 text-xs font-semibold text-content-muted hover:text-content-heading"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWeeklyShopping}
                className="btn-3d flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition"
              >
                <Check size={14} strokeWidth={2.6} /> Agregar seleccionados a la lista (
                {previewItems.filter((i) => i.checked).length})
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
