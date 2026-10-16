import React, { useState, useEffect } from "react";
import { Camera, Check, Heart, ShoppingCart, Sparkles, Utensils } from "lucide-react";
import { LocalRecipe, RecipeMatchResult } from "@/lib/localRecipesMatching";
import { getRecipeFallbackImage } from "@/lib/recipeApi";
import { loadCustomRecipePhotos, RECIPE_PHOTO_CHANGED_EVENT } from "@/lib/recipeCustomImages";

export interface RecipeCardProps {
  recipe: LocalRecipe;
  matchResult?: RecipeMatchResult;
  isFavorite?: boolean;
  onToggleFavorite?: (recipeId: string) => void;
  onOpenDetail: (recipe: LocalRecipe) => void;
  onQuickCook?: (recipe: LocalRecipe) => void;
  onAddMissingToShopping?: (
    recipeTitle: string,
    missing: Array<{ name: string; quantity?: string }>
  ) => void;
}

export function RecipeCard({
  recipe,
  matchResult,
  isFavorite = false,
  onToggleFavorite,
  onOpenDetail,
  onQuickCook,
  onAddMissingToShopping,
}: RecipeCardProps) {
  const missingCount = matchResult?.missingIngredients.length ?? 0;
  const isReady = matchResult?.tier === "ready";
  const isAlmost = matchResult?.tier === "almost";

  const [customPhoto, setCustomPhoto] = useState<string | null>(() => {
    const photos = loadCustomRecipePhotos();
    return photos[recipe.id] || null;
  });

  useEffect(() => {
    const handlePhotoChanged = (e: any) => {
      if (e.detail?.recipeId === recipe.id) {
        setCustomPhoto(e.detail.photoDataUrl || null);
      }
    };
    window.addEventListener(RECIPE_PHOTO_CHANGED_EVENT, handlePhotoChanged);
    return () => window.removeEventListener(RECIPE_PHOTO_CHANGED_EVENT, handlePhotoChanged);
  }, [recipe.id]);

  const displayImage = customPhoto || recipe.image || getRecipeFallbackImage(recipe.name, recipe.category);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(recipe.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenDetail(recipe);
    }
  };

  return (
    <div
      data-testid="recipe-card"
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${recipe.name}`}
      onClick={() => onOpenDetail(recipe)}
      onKeyDown={handleKeyDown}
      className={`card-3d group relative flex flex-col justify-between overflow-hidden rounded-[22px] border bg-surface p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-focus ${
        isReady
          ? "border-status-ok-border hover:border-status-ok-border"
          : isAlmost
          ? "border-status-soon-border hover:border-status-soon-border"
          : "border-line hover:border-brand-border"
      }`}
    >
      <div>
        {/* Image & Badges */}
        <div className="relative h-36 w-full overflow-hidden rounded-xl bg-surface-muted">
          <img
            src={displayImage}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getRecipeFallbackImage(
                recipe.name,
                recipe.category
              );
            }}
            alt={recipe.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Insignia de recuerdo: Si tiene foto propia subida */}
          {customPhoto && (
            <span
              title="Tenés guardada una foto de cuando cocinaste esta receta"
              className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-emerald-600/90 text-white px-2 py-0.5 text-[10px] font-bold backdrop-blur-md shadow-xs border border-white/20"
            >
              <Camera size={10} /> Mi plato
            </span>
          )}

          {/* Favorite button */}
          <button
            type="button"
            role="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Quitar de favoritas" : "Agregar a favoritas"}
            onClick={handleFavoriteClick}
            className={`absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition ${
              isFavorite
                ? "bg-rose-500 text-white shadow-sm ring-2 ring-white/50"
                : "bg-surface/80 text-content-muted hover:bg-surface hover:text-rose-500"
            }`}
          >
            <Heart
              size={16}
              className={isFavorite ? "fill-current" : "transition-colors"}
              strokeWidth={2.4}
            />
          </button>

          {/* Match ratio badge */}
          {matchResult && (
            <span
              className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border backdrop-blur-md ${
                isReady
                  ? "bg-status-ok-bg/95 text-status-ok-text border-status-ok-border"
                  : isAlmost
                  ? "bg-status-soon-bg/95 text-status-soon-text border-status-soon-border"
                  : "bg-surface/90 text-content-body border-line"
              }`}
            >
              {isReady ? (
                <>
                  <Check size={12} strokeWidth={3} /> Podés hacerla ahora
                </>
              ) : isAlmost ? (
                <>
                  <Sparkles size={12} className="text-status-soon-dot" /> Te falta{" "}
                  {missingCount === 1 ? "1 ingrediente" : `${missingCount} ingredientes`}
                </>
              ) : (
                <>
                  <Utensils size={11} className="text-content-muted" /> Tenés{" "}
                  {matchResult.matchRatio.matched} de {matchResult.matchRatio.total}
                </>
              )}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
              {recipe.category}
            </span>
            <span className="text-[11px] font-semibold text-content-muted">
              {recipe.ingredients.length} ing.
            </span>
          </div>

          <h4 className="mt-0.5 font-display text-base font-bold text-content-heading line-clamp-1 group-hover:text-brand transition-colors">
            {recipe.name}
          </h4>

          <p className="mt-1 text-xs text-content-muted line-clamp-2">
            {recipe.ingredients.map((i) => i.name).join(", ")}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
        <span className="text-xs font-bold text-brand hover:underline">
          Ver receta
        </span>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isReady && onQuickCook ? (
            <button
              type="button"
              onClick={() => onQuickCook(recipe)}
              className="btn-3d-accent flex min-h-[34px] items-center gap-1 rounded-xl bg-accent-lime px-3 py-1 text-xs font-bold text-accent-lime-fg"
            >
              <Check size={13} strokeWidth={2.6} /> Cocinar
            </button>
          ) : matchResult && missingCount > 0 && onAddMissingToShopping ? (
            <button
              type="button"
              onClick={() =>
                onAddMissingToShopping(recipe.name, matchResult.missingIngredients)
              }
              title="Agregar faltantes a la lista de compras"
              className="flex min-h-[34px] items-center gap-1 rounded-xl border border-brand-border bg-brand-subtle px-2.5 py-1 text-xs font-bold text-brand-text transition hover:bg-brand-border/40"
            >
              <ShoppingCart size={13} /> + Lista ({missingCount})
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
