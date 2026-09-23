import React from "react";
import {
  AlertTriangle,
  Check,
  ChefHat,
  Info,
  Sparkles,
  Utensils,
} from "lucide-react";
import { RecipeSuggestion, getRecipeFallbackImage } from "@/lib/recipeApi";

export type RecipeFilter = "all" | "vegetarian" | "glutenFree" | "quick";

export interface RecipesSectionProps {
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
}

export function RecipesSection({
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
}: RecipesSectionProps) {
  return (
    <section id="module-recipes" className="scroll-mt-24 mt-6">
      <div className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_12px_35px_rgba(55,63,48,0.04)] sm:p-8">
        {/* Header & Filter Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">
              <ChefHat size={15} /> Cocina inteligente & rescate
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.035em] text-content-heading sm:text-3xl">
              Recetas con lo que vence primero.
            </h2>
            <p className="mt-1 text-xs text-content-muted sm:text-sm">
              {recipesLoading
                ? "Buscando preparaciones que aprovechen tus alimentos..."
                : visibleRecipes.length > 0 || recipes.length > 0
                ? `Detectamos ${visibleRecipes.length || recipes.length} ideas para cocinar y evitar desperdicio.`
                : "No encontramos recetas específicas para los alimentos actuales."}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-bold transition duration-200 active:scale-95 ${
                  recipeFilter === value
                    ? "bg-brand text-white shadow-sm ring-1 ring-brand-focus"
                    : "border border-line bg-surface-subtle text-content-body hover:bg-surface-elevated hover:text-content-heading"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {recipesWarning && (
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-status-expired-border bg-status-expired-bg p-3.5 text-xs text-status-expired-text">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{recipesWarning}</span>
          </div>
        )}

        {recipesInfo && (
          <div className="mt-5 rounded-2xl border border-brand-border bg-brand-subtle p-5 text-center">
            <p className="text-3xl">🌱</p>
            <p className="mt-1.5 text-xs font-bold text-brand-text sm:text-sm">{recipesInfo}</p>
            <p className="mt-0.5 text-xs text-content-muted">
              Cuando algún alimento de tu despensa esté cerca de su fecha límite, te propondremos recetas para usarlo.
            </p>
          </div>
        )}

        {recipesError && (
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-recipe-border bg-recipe-bg p-3.5 text-xs text-recipe-text">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>{recipesError}</span>
          </div>
        )}

        {/* Recipes 3D Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              className="card-3d group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-line bg-surface p-4 shadow-sm transition hover:border-brand-border hover:bg-surface-elevated"
            >
              <div>
                {/* Recipe preview image */}
                <div className="relative h-40 w-full overflow-hidden rounded-xl bg-surface-muted">
                  <img
                    src={recipe.image || getRecipeFallbackImage(recipe.title, recipe.category)}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getRecipeFallbackImage(
                        recipe.title,
                        recipe.category
                      );
                    }}
                    alt={recipe.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  
                  {recipe.pantryMatchRatio && (
                    <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-surface/90 px-2 py-1 text-xs font-bold text-brand-text shadow-sm backdrop-blur-md">
                      <Sparkles size={12} className="text-accent-lime-fg" />
                      {recipe.pantryMatchRatio.matched} de {recipe.pantryMatchRatio.total} en tu despensa
                    </span>
                  )}

                  {(recipe.isLocalFallback || recipe.source === "FreshTrack") && (
                    <span className="absolute right-2.5 top-2.5 rounded-md border border-brand-border/60 bg-brand/90 px-2 py-0.5 text-xs font-bold text-white shadow-xs backdrop-blur-xs">
                      Sugerencia local
                    </span>
                  )}
                </div>

                {/* Recipe Title & Details */}
                <div className="mt-3.5">
                  <h3 className="line-clamp-1 text-sm font-bold text-content-heading transition group-hover:text-brand">
                    {recipe.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-content-muted">
                    Usa: {recipe.matchedIngredients.join(", ") || "Ingredientes sugeridos"}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                <span className="text-xs font-semibold text-brand hover:underline">
                  Ver pasos e ingredientes
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onInitiateConsumption(recipe);
                  }}
                  className="btn-3d-accent flex min-h-[38px] items-center gap-1.5 rounded-xl bg-accent-lime px-3 py-1.5 text-xs font-bold text-accent-lime-fg"
                >
                  <Check size={14} strokeWidth={2.6} /> Aproveché
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {recipeLimit < visibleRecipes.length && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setRecipeLimit((limit) => Math.min(limit + 3, visibleRecipes.length))}
              className="btn-3d min-h-[44px] rounded-xl border border-line bg-surface px-6 py-2.5 text-xs font-bold text-content-heading hover:bg-surface-elevated"
            >
              Cargar más recetas ({visibleRecipes.length - recipeLimit} restantes)
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4 text-xs text-content-muted">
          <span>
            {recipes.some((r) => r.isLocalFallback || r.source === "FreshTrack")
              ? "Ideas basadas en despensa y base culinaria de FreshTrack."
              : "Sugerencias orientativas de TheMealDB."}
          </span>
          <span className="flex items-center gap-1">
            <Utensils size={13} /> Cocina de rescate
          </span>
        </div>
      </div>
    </section>
  );
}
