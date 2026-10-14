import React from "react";
import { Check, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipeSuggestion, getRecipeFallbackImage } from "@/lib/recipeApi";
import { scaleMeasure } from "@/lib/productHelpers";
import { playChimeSound } from "@/lib/feedback";
import { ShoppingItem, addOrMergeShoppingItem } from "@/lib/shoppingList";

export interface RecipeDetailModalProps {
  recipe: RecipeSuggestion | null;
  loading: boolean;
  portions: number;
  setPortions: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onInitiateConsumption: (recipe: RecipeSuggestion) => void;
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
}

export function RecipeDetailModal({
  recipe,
  loading,
  portions,
  setPortions,
  onClose,
  onInitiateConsumption,
  setShoppingList,
}: RecipeDetailModalProps) {
  if (!recipe) return null;

  const handleAddMissing = () => {
    if (!recipe.ingredients) return;
    const missing = recipe.ingredients.filter(
      (ing) =>
        !recipe.matchedIngredients.some(
          (m) =>
            m.toLowerCase().includes(ing.name.toLowerCase()) ||
            ing.name.toLowerCase().includes(m.toLowerCase())
        )
    );
    if (missing.length === 0) {
      toast.info("¡Tenés todos los ingredientes en tu despensa!");
      return;
    }
    missing.forEach((m) => {
      setShoppingList((prev) =>
        addOrMergeShoppingItem(prev, {
          name: m.name,
          quantity: scaleMeasure(m.measure, portions / 2) || "1 unidad",
          category: "Almacén seco",
        })
      );
    });
    playChimeSound("pop");
    toast.success(`Agregaste ${missing.length} faltantes a tu lista de compras`, {
      description: `Cantidades adaptadas para ${portions} porciones.`,
    });
  };

  return (
    <Dialog open={Boolean(recipe)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[620px] p-0 overflow-hidden" hideCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>{recipe.title}</DialogTitle>
          <DialogDescription>{recipe.category || "Detalle de receta"}</DialogDescription>
        </DialogHeader>
        <div className="relative h-40 overflow-hidden bg-surface-elevated">
          <img
            src={recipe.image || getRecipeFallbackImage(recipe.title, recipe.category)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getRecipeFallbackImage(recipe.title, recipe.category);
            }}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-content/90 via-content/40 to-transparent" />
          <button
            type="button"
            aria-label="Cerrar receta"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/80 p-2 text-content backdrop-blur-sm hover:bg-surface"
          >
            <X size={17} />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {recipe.isOriginalEnglish && (
                <span className="rounded-full bg-status-soon-bg px-2 py-0.5 text-xs font-bold text-status-soon-text border border-status-soon-border">
                  Texto original en inglés
                </span>
              )}
              {(recipe.isLocalFallback || recipe.source === "FreshTrack") && (
                <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-bold text-brand-text border border-brand-border">
                  Ideas locales
                </span>
              )}
              {recipe.isGlutenFreeEstimated && (
                <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-bold text-brand-text border border-brand-border">
                  Sin TACC (estimado)
                </span>
              )}
            </div>
            <p className="font-display text-2xl font-bold tracking-tight text-white">{recipe.title}</p>
            <p className="mt-1 text-xs text-brand-subtle">
              {recipe.area || "Receta sugerida"}
              {recipe.category ? ` · ${recipe.category}` : ""}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-content-muted">Cargando ingredientes y pasos…</div>
        ) : (
          <div className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Ingredientes</p>
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-subtle px-2 py-0.5 text-xs">
                    <span className="text-[11px] font-semibold text-content-muted">Porciones:</span>
                    <button
                      type="button"
                      onClick={() => setPortions((p) => Math.max(1, p - 1))}
                      className="flex h-5 w-5 items-center justify-center rounded bg-surface hover:bg-surface-elevated font-bold text-content text-xs"
                      title="Menos porciones"
                    >
                      -
                    </button>
                    <span className="font-bold text-brand min-w-[12px] text-center">{portions}</span>
                    <button
                      type="button"
                      onClick={() => setPortions((p) => Math.min(12, p + 1))}
                      className="flex h-5 w-5 items-center justify-center rounded bg-surface hover:bg-surface-elevated font-bold text-content text-xs"
                      title="Más porciones"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(recipe.ingredients || recipe.matchedIngredients.map((name) => ({ name, measure: "a gusto" }))).map((ingredient) => (
                    <div key={`${ingredient.name}-${ingredient.measure}`} className="flex items-start justify-between gap-3 border-b border-line-subtle pb-2 text-xs">
                      <span className="font-semibold text-content-heading">{ingredient.name}</span>
                      <span className="text-right text-content-muted">
                        {scaleMeasure(ingredient.measure, portions / 2)}
                      </span>
                    </div>
                  ))}
                </div>

                {recipe.ingredients && (
                  <button
                    type="button"
                    onClick={handleAddMissing}
                    className="mt-3.5 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-subtle px-3 py-1.5 text-xs font-bold text-brand-text hover:bg-surface transition"
                  >
                    <ShoppingCart size={13} /> Agregar faltantes a la lista de compras
                  </button>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Paso a paso</p>
                <div className="mt-3 space-y-3">
                  {(recipe.instructions || "Prepará los ingredientes, cociná hasta que estén tiernos y serví caliente.").split(/\r?\n+/).filter(Boolean).map((step, index) => (
                    <div key={`${index}-${step.slice(0, 8)}`} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand-text">{index + 1}</span>
                      <p className="text-xs leading-5 text-content-body">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              data-testid="consume-recipe"
              onClick={() => {
                onInitiateConsumption(recipe);
                onClose();
              }}
              className="mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-focus"
            >
              <Check size={15} /> Aproveché esta receta
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
