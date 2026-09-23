import React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Info,
  MapPin,
  Route,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/product";
import { formatRelativeDays } from "@/lib/dates";
import { RecipeSuggestion, getRecipeFallbackImage } from "@/lib/recipeApi";

export type RecipeFilter = "all" | "vegetarian" | "glutenFree" | "quick";

export interface RecipesSectionProps {
  suggestedRoute: Array<{ number: string; name: string; place: string; product: Product }>;
  recipes: RecipeSuggestion[];
  visibleRecipes: RecipeSuggestion[];
  shownRecipes: RecipeSuggestion[];
  recipesLoading: boolean;
  recipesWarning: string | null;
  recipesInfo: string | null;
  recipesError: string | null;
  recipeFilter: RecipeFilter;
  setRecipeFilter: (filter: RecipeFilter) => void;
  recipeLimit: number;
  setRecipeLimit: React.Dispatch<React.SetStateAction<number>>;
  onOpenRecipeDetail: (recipe: RecipeSuggestion) => void;
  onInitiateConsumption: (recipe: RecipeSuggestion) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateToPantry: () => void;
}

export function RecipesSection({
  suggestedRoute,
  recipes,
  visibleRecipes,
  shownRecipes,
  recipesLoading,
  recipesWarning,
  recipesInfo,
  recipesError,
  recipeFilter,
  setRecipeFilter,
  recipeLimit,
  setRecipeLimit,
  onOpenRecipeDetail,
  onInitiateConsumption,
  onSelectProduct,
  onNavigateToPantry,
}: RecipesSectionProps) {
  return (
    <section id="module-route" className="scroll-mt-24 mt-5 grid gap-5 md:grid-cols-[1fr_1fr]">
      {/* Suggested Route card */}
      <div className="rounded-[24px] bg-content p-5 text-white sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-subtle">
              <Route size={13} /> Recorrida sugerida
            </p>
            <h2 className="mt-2 font-serif text-2xl sm:text-[25px] font-semibold tracking-[-0.035em]">
              Cosas para resolver primero.
            </h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-accent-lime">
            <MapPin size={18} />
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {suggestedRoute.length > 0 ? (
            suggestedRoute.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onSelectProduct(item.product);
                  toast(item.name, {
                    description: `Ubicación: ${item.place} · ${formatRelativeDays(item.product.days)}`,
                  });
                }}
                className="group rounded-xl bg-brand/50 p-3 text-left transition hover:bg-brand"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-lime text-xs font-extrabold text-accent-lime-fg">
                    {item.number}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-brand-subtle transition group-hover:text-accent-lime"
                  />
                </div>
                <p className="mt-4 truncate text-xs font-semibold text-white">{item.name}</p>
                <p className="mt-1 truncate text-xs text-brand-subtle/80">{item.place}</p>
              </button>
            ))
          ) : (
            <div className="col-span-3 py-4 text-center text-xs text-brand-subtle/80">
              Tu despensa está al día sin urgencias.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onNavigateToPantry}
          className="mt-5 flex min-h-[44px] items-center gap-1 text-xs font-bold text-accent-lime hover:underline"
        >
          Ver despensa completa <ChevronRight size={14} />
        </button>
      </div>

      {/* Recipes card */}
      <div className="rounded-[24px] border border-recipe-border bg-recipe-bg p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-recipe-text">
              <Utensils size={13} /> Ideas para aprovechar
            </p>
            <h2 className="mt-2 max-w-[300px] font-serif text-2xl sm:text-[25px] font-semibold leading-[1.05] tracking-[-0.035em] text-content-heading">
              Recetas con lo que vence primero.
            </h2>
          </div>
          <div className="text-4xl">🥬</div>
        </div>
        <p className="mt-3 text-xs leading-5 text-content-body">
          {recipesLoading
            ? "Buscando opciones que aprovechen tu despensa…"
            : visibleRecipes.length > 0 || recipes.length > 0
            ? `Encontramos ${visibleRecipes.length || recipes.length} ideas para usar antes de que se pierdan.`
            : "No encontramos recetas para los productos actuales."}
        </p>

        {recipesWarning && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-status-expired-border bg-status-expired-bg p-3 text-xs text-status-expired-text">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{recipesWarning}</span>
          </div>
        )}

        {recipesInfo && (
          <div className="mt-3 rounded-xl border border-brand-border bg-brand-subtle p-4 text-center">
            <p className="text-2xl">🌱</p>
            <p className="mt-1 text-xs font-bold text-brand-text">{recipesInfo}</p>
            <p className="mt-0.5 text-xs text-content-muted">
              Cuando algún alimento esté cerca de vencer te sugeriremos ideas para aprovecharlo.
            </p>
          </div>
        )}

        {recipesError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-recipe-border bg-recipe-bg p-2.5 text-xs text-recipe-text">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>{recipesError}</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              ["all", "Todas"],
              ["vegetarian", "Vegetarianas"],
              ["glutenFree", "Sin TACC (estimado)"],
              ["quick", "Rápidas"],
            ] as Array<[RecipeFilter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRecipeFilter(value)}
              className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                recipeFilter === value
                  ? "bg-surface text-recipe-badge-text shadow-sm border border-recipe-border"
                  : "bg-recipe-badge-bg/40 text-recipe-text hover:bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {shownRecipes.map((recipe) => (
            <div
              key={recipe.id}
              data-testid="recipe-card"
              role="button"
              tabIndex={0}
              aria-label={`Ver detalle de ${recipe.title}`}
              onClick={() => onOpenRecipeDetail(recipe)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onOpenRecipeDetail(recipe);
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-surface/70 p-2.5 transition hover:bg-surface border border-recipe-border/50"
            >
              <img
                src={recipe.image || getRecipeFallbackImage(recipe.title, recipe.category)}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getRecipeFallbackImage(
                    recipe.title,
                    recipe.category
                  );
                }}
                alt={recipe.title}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-content-heading">{recipe.title}</p>
                  {(recipe.isLocalFallback || recipe.source === "FreshTrack") && (
                    <span className="shrink-0 rounded-md bg-brand-subtle px-1.5 py-0.5 text-xs font-bold text-brand-text border border-brand-border/50">
                      Ideas locales
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-content-muted">
                  {recipe.pantryMatchRatio
                    ? `Tenés ${recipe.pantryMatchRatio.matched} de ${recipe.pantryMatchRatio.total} ingredientes`
                    : `Usa: ${recipe.matchedIngredients.join(", ")}`}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-recipe-text">Ver ingredientes y pasos</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onInitiateConsumption(recipe);
                }}
                className="shrink-0 min-h-[44px] rounded-lg bg-recipe-badge-bg px-3 py-2 text-xs font-bold text-recipe-badge-text transition hover:opacity-90"
              >
                Aproveché
              </button>
            </div>
          ))}
        </div>
        {recipeLimit < visibleRecipes.length && (
          <button
            type="button"
            onClick={() => setRecipeLimit((limit) => Math.min(limit + 3, visibleRecipes.length))}
            className="mt-4 min-h-[44px] w-full rounded-xl border border-recipe-border bg-surface px-3 py-2.5 text-xs font-bold text-recipe-badge-text transition hover:bg-surface-elevated"
          >
            Cargar más ({visibleRecipes.length - recipeLimit} disponibles)
          </button>
        )}
        <p className="mt-3 text-xs text-content-muted">
          {recipes.some((r) => r.isLocalFallback || r.source === "FreshTrack")
            ? "Ideas locales y sugerencias orientativas"
            : "Fuente: TheMealDB · sugerencias orientativas"}
        </p>
      </div>
    </section>
  );
}
