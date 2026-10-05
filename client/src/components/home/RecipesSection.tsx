import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChefHat,
  ChevronDown,
  ChevronRight,
  Globe,
  Hourglass,
  Info,
  Loader2,
  PackageOpen,
  Plus,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Utensils,
} from "lucide-react";
import { RecipeSuggestion, getRecipeFallbackImage } from "@/lib/recipeApi";
import { Product } from "@/types/product";
import {
  calculateLocalRecipeMatches,
  fetchOnlineRecipesForPantry,
  LOCAL_RECIPES,
  LocalRecipe,
  RecipeMatchResult,
} from "@/lib/localRecipesMatching";

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
  // Bloque C additions
  pantryProducts?: Product[];
  onAddMissingToShoppingList?: (
    recipeTitle: string,
    missing: Array<{ name: string; quantity?: string }>
  ) => void;
  onOpenAdd?: () => void;
  onOpenScan?: () => void;
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
  pantryProducts = [],
  onAddMissingToShoppingList,
  onOpenAdd,
  onOpenScan,
}: RecipesSectionProps) {
  // Tabs: "¿Qué puedo cocinar?" (Instant local matching) vs "Aprovechar por vencer" (TheMealDB)
  const [activeTab, setActiveTab] = useState<"whatCanICook" | "rescueExpiring">("rescueExpiring");

  // Online recipes state for "¿Qué puedo cocinar?"
  const [onlineRecipes, setOnlineRecipes] = useState<LocalRecipe[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [moreCollapsed, setMoreCollapsed] = useState(true);

  // Combine local recipes with online search results if any
  const combinedRecipes = useMemo(() => {
    return [...LOCAL_RECIPES, ...onlineRecipes];
  }, [onlineRecipes]);

  // Instant pure client-side recipe match calculation (C2, C3, C6)
  const localMatches = useMemo(() => {
    return calculateLocalRecipeMatches(pantryProducts, combinedRecipes);
  }, [pantryProducts, combinedRecipes]);

  // Manual trigger for online recipes (C4)
  const handleSearchOnline = async () => {
    setOnlineLoading(true);
    try {
      const fetched = await fetchOnlineRecipesForPantry(pantryProducts);
      setOnlineRecipes(fetched);
      setMoreCollapsed(false); // expand to show new online recipes
    } finally {
      setOnlineLoading(false);
    }
  };

  // Convert LocalRecipe to RecipeSuggestion for consumption / detail modal
  const toSuggestion = (match: RecipeMatchResult): RecipeSuggestion => {
    return {
      id: match.recipe.id,
      title: match.recipe.name,
      image:
        match.recipe.image ||
        getRecipeFallbackImage(match.recipe.name, match.recipe.category),
      category: match.recipe.category,
      matchedIngredients: match.matchedIngredients,
      source: match.recipe.isOnline ? "TheMealDB" : "FreshTrack",
      ingredients: match.recipe.ingredients.map((i) => ({
        name: i.name,
        measure: i.quantity || "a gusto",
      })),
      instructions: match.recipe.instructions.join("\n"),
      isLocalFallback: !match.recipe.isOnline,
      pantryMatchRatio: {
        matched: match.matchRatio.matched,
        total: match.matchRatio.total,
      },
    };
  };

  return (
    <section id="module-recipes" className="scroll-mt-24 mt-6">
      <div className="tomorro-card-bone relative overflow-hidden p-5 sm:p-6 lg:p-7 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
        {/* Navigation Tabs between "¿Qué puedo cocinar?" and "Aprovechar por vencer" */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("whatCanICook")}
              className={`flex min-h-[42px] items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeTab === "whatCanICook"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "border border-line bg-surface text-content-muted hover:text-content-heading hover:bg-surface-muted"
              }`}
            >
              <ChefHat size={16} /> ¿Qué puedo cocinar?
              <span className="tomorro-tag-beacon">
                Instantáneo
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rescueExpiring")}
              className={`flex min-h-[42px] items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeTab === "rescueExpiring"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "border border-line bg-surface text-content-muted hover:text-content-heading hover:bg-surface-muted"
              }`}
            >
              <Hourglass size={15} /> Aprovechar por vencer
            </button>
          </div>

          {activeTab === "whatCanICook" && localMatches && (
            <button
              type="button"
              disabled={onlineLoading}
              onClick={handleSearchOnline}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-bold text-content transition hover:bg-brand-subtle hover:text-brand-text disabled:opacity-50"
            >
              {onlineLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-brand" />
                  <span>Buscando online…</span>
                </>
              ) : (
                <>
                  <Globe size={14} />
                  <span>Buscar más recetas online</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* TAB 1: ¿QUÉ PUEDO COCINAR? (BLOQUE C) */}
        {activeTab === "whatCanICook" && (
          <div className="mt-5">
            {localMatches === null ? (
              // C6: Empty state when < 3 non-expired products
              <div className="rounded-2xl border border-line bg-surface-subtle/50 py-12 px-4 text-center">
                <PackageOpen className="mx-auto text-content-muted" size={38} />
                <h3 className="mt-3 font-display text-lg font-bold text-content-heading">
                  Tu despensa necesita al menos 3 alimentos
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-content-muted leading-relaxed">
                  Cargá los productos que tenés en tu cocina o escaneá un ticket de compra para que
                  FreshTrack calcule al instante y sin internet qué comidas podés preparar hoy.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  {onOpenScan && (
                    <button
                      type="button"
                      onClick={onOpenScan}
                      className="btn-3d inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover"
                    >
                      <ScanLine size={15} /> Escanear ticket
                    </button>
                  )}
                  {onOpenAdd && (
                    <button
                      type="button"
                      onClick={onOpenAdd}
                      className="btn-3d inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-border bg-brand-subtle px-4 py-2.5 text-xs font-bold text-brand-text transition hover:bg-surface"
                    >
                      <Plus size={15} /> Agregar alimento
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Podés hacer ahora (100% match) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-status-ok-dot" />
                    <h3 className="font-display text-lg font-bold text-content-heading">
                      Podés hacer ahora
                    </h3>
                    <span className="rounded-full bg-status-ok-bg px-2.5 py-0.5 text-xs font-bold text-status-ok-text border border-status-ok-border">
                      {localMatches.ready.length} {localMatches.ready.length === 1 ? "receta" : "recetas"} (100% de ingredientes)
                    </span>
                  </div>

                  {localMatches.ready.length === 0 ? (
                    <p className="rounded-xl border border-line bg-surface-subtle p-3.5 text-xs text-content-muted">
                      No tenés todos los ingredientes para una receta al 100% todavía. ¡Mirá las opciones de abajo que te falta poco!
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {localMatches.ready.map((match) => {
                        const sug = toSuggestion(match);
                        return (
                          <div
                            key={match.recipe.id}
                            data-testid="recipe-card"
                            className="card-3d group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-status-ok-border bg-surface p-4 shadow-sm transition hover:border-brand-border hover:bg-surface-elevated"
                          >
                            <div>
                              <div className="relative h-36 w-full overflow-hidden rounded-xl bg-surface-muted">
                                <img
                                  src={sug.image}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      getRecipeFallbackImage(sug.title, sug.category);
                                  }}
                                  alt={sug.title}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-status-ok-bg/95 px-2 py-0.5 text-xs font-bold text-status-ok-text border border-status-ok-border">
                                  <Check size={12} strokeWidth={3} /> Tenés {match.matchRatio.matched} de {match.matchRatio.total}
                                </span>
                              </div>

                              <div className="mt-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                                  {match.recipe.category}
                                </span>
                                <h4 className="mt-0.5 font-display text-base font-bold text-content-heading line-clamp-1">
                                  {match.recipe.name}
                                </h4>
                                <p className="mt-1 text-xs text-content-muted line-clamp-2">
                                  Ingredientes: {match.recipe.ingredients.map((i) => i.name).join(", ")}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                              <button
                                type="button"
                                onClick={() => onOpenRecipeDetail(sug)}
                                className="text-xs font-bold text-brand hover:underline"
                              >
                                Ver receta completa
                              </button>
                              <button
                                type="button"
                                onClick={() => onInitiateConsumption(sug)}
                                className="btn-3d-accent flex min-h-[38px] items-center gap-1.5 rounded-xl bg-accent-lime px-3 py-1.5 text-xs font-bold text-accent-lime-fg"
                              >
                                <Check size={14} strokeWidth={2.6} /> Cocinar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Te falta poco (80%+ match) */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-status-soon-dot" />
                    <h3 className="font-display text-lg font-bold text-content-heading">
                      Te falta poco
                    </h3>
                    <span className="rounded-full bg-status-soon-bg px-2.5 py-0.5 text-xs font-bold text-status-soon-text border border-status-soon-border">
                      {localMatches.almost.length} {localMatches.almost.length === 1 ? "receta" : "recetas"} (80%+ de ingredientes)
                    </span>
                  </div>

                  {localMatches.almost.length === 0 ? (
                    <p className="rounded-xl border border-line bg-surface-subtle p-3.5 text-xs text-content-muted">
                      No hay recetas en las que te falte solo 1 ingrediente.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {localMatches.almost.map((match) => {
                        const sug = toSuggestion(match);
                        return (
                          <div
                            key={match.recipe.id}
                            data-testid="recipe-card"
                            className="card-3d group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-status-soon-border bg-surface p-4 shadow-sm transition hover:border-brand-border hover:bg-surface-elevated"
                          >
                            <div>
                              <div className="relative h-36 w-full overflow-hidden rounded-xl bg-surface-muted">
                                <img
                                  src={sug.image}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      getRecipeFallbackImage(sug.title, sug.category);
                                  }}
                                  alt={sug.title}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-surface/90 px-2 py-0.5 text-xs font-bold text-brand-text shadow-sm backdrop-blur-md">
                                  <Sparkles size={12} className="text-status-soon-dot" /> Tenés {match.matchRatio.matched} de {match.matchRatio.total}
                                </span>
                              </div>

                              <div className="mt-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                                  {match.recipe.category}
                                </span>
                                <h4 className="mt-0.5 font-display text-base font-bold text-content-heading line-clamp-1">
                                  {match.recipe.name}
                                </h4>

                                {/* Missing ingredients chips */}
                                <div className="mt-2 flex flex-wrap items-center gap-1">
                                  <span className="text-[11px] font-bold text-status-expired-text">Te falta:</span>
                                  {match.missingIngredients.map((m, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-md border border-status-expired-border bg-status-expired-bg px-1.5 py-0.5 text-xs font-semibold text-status-expired-text"
                                    >
                                      {m.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 border-t border-line/60 pt-3">
                              {onAddMissingToShoppingList && match.missingIngredients.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAddMissingToShoppingList(
                                      match.recipe.name,
                                      match.missingIngredients
                                    )
                                  }
                                  className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-subtle px-3 py-1.5 text-xs font-bold text-brand-text transition hover:bg-brand-border/40"
                                >
                                  <ShoppingCart size={13} /> Agregar faltantes a la lista
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenRecipeDetail(sug)}
                                className="text-center text-xs font-bold text-content-body hover:text-brand"
                              >
                                Ver pasos e ingredientes
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Necesitás comprar más (resto, colapsado C3) */}
                <div className="rounded-2xl border border-line bg-surface-subtle/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMoreCollapsed((prev) => !prev)}
                    className="flex w-full min-h-[48px] items-center justify-between px-4 py-3 bg-surface-subtle text-left transition hover:bg-surface-elevated"
                  >
                    <div className="flex items-center gap-2.5">
                      {moreCollapsed ? (
                        <ChevronRight size={16} className="text-content-muted" />
                      ) : (
                        <ChevronDown size={16} className="text-content-muted" />
                      )}
                      <h3 className="font-display text-base font-bold text-content-heading">
                        Necesitás comprar más
                      </h3>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-content-muted border border-line">
                        {localMatches.more.length} recetas
                      </span>
                    </div>
                    <span className="text-xs text-content-muted">
                      {moreCollapsed ? "Desplegar opciones" : "Ocultar"}
                    </span>
                  </button>

                  {!moreCollapsed && (
                    <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-line/60">
                      {localMatches.more.slice(0, 15).map((match) => {
                        const sug = toSuggestion(match);
                        return (
                          <div
                            key={match.recipe.id}
                            className="card-3d group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-line bg-surface p-3.5 shadow-xs"
                          >
                            <div>
                              <div className="relative h-28 w-full overflow-hidden rounded-lg bg-surface-muted">
                                <img
                                  src={sug.image}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      getRecipeFallbackImage(sug.title, sug.category);
                                  }}
                                  alt={sug.title}
                                  className="h-full w-full object-cover"
                                />
                                {match.recipe.isOnline && (
                                  <span className="absolute top-2 right-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                    Online
                                  </span>
                                )}
                                <span className="absolute bottom-1.5 left-1.5 rounded bg-surface/90 px-1.5 py-0.5 text-xs font-semibold text-content-body backdrop-blur-xs">
                                  {match.matchRatio.matched} de {match.matchRatio.total}
                                </span>
                              </div>

                              <div className="mt-2.5">
                                <h4 className="font-display text-sm font-bold text-content-heading line-clamp-1">
                                  {match.recipe.name}
                                </h4>
                                <p className="mt-1 text-xs text-content-muted line-clamp-2">
                                  Faltan: {match.missingIngredients.map((m) => m.name).join(", ")}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/50 pt-2">
                              {onAddMissingToShoppingList && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAddMissingToShoppingList(
                                      match.recipe.name,
                                      match.missingIngredients
                                    )
                                  }
                                  className="text-xs font-bold text-brand hover:underline"
                                >
                                  + Lista de compras
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenRecipeDetail(sug)}
                                className="text-xs font-semibold text-content-muted hover:text-content-heading"
                              >
                                Ver
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APROVECHAR POR VENCER (EXISTING FEATURE) */}
        {activeTab === "rescueExpiring" && (
          <div className="mt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-content-muted">
                  <ChefHat size={15} className="text-brand" /> Cocina de rescate
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-content-heading">
                  Recetas con lo que vence primero.
                </h3>
                <p className="mt-1 text-xs text-content-muted">
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
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-status-expired-border bg-status-expired-bg p-3.5 text-xs text-status-expired-text">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{recipesWarning}</span>
              </div>
            )}

            {recipesInfo && (
              <div className="mb-5 rounded-2xl border border-brand-border bg-brand-subtle p-5 text-center">
                <p className="text-3xl">🌱</p>
                <p className="mt-1.5 text-xs font-bold text-brand-text sm:text-sm">{recipesInfo}</p>
                <p className="mt-0.5 text-xs text-content-muted">
                  Cuando algún alimento de tu despensa esté cerca de su fecha límite, te propondremos recetas para usarlo.
                </p>
              </div>
            )}

            {recipesError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-recipe-border bg-recipe-bg p-3.5 text-xs text-recipe-text">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>{recipesError}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-line bg-surface p-4 shadow-sm transition hover:border-brand-border hover:-translate-y-1 hover:shadow-md"
                >
                  <div>
                    <div className="relative h-40 w-full overflow-hidden rounded-[16px] bg-surface-muted">
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
                        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-bold text-content-heading shadow-sm backdrop-blur-md">
                          <Sparkles size={12} className="text-brand" />
                          {recipe.pantryMatchRatio.matched} de {recipe.pantryMatchRatio.total} en despensa
                        </span>
                      )}

                      {(recipe.isLocalFallback || recipe.source === "FreshTrack") && (
                        <span className="tomorro-tag-beacon absolute right-2.5 top-2.5">
                          Sugerencia local
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5">
                      <h3 className="line-clamp-1 font-display text-base font-bold text-content-heading transition group-hover:text-brand">
                        {recipe.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-content-muted">
                        Usa: {recipe.matchedIngredients.join(", ") || "Ingredientes sugeridos"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                    <span className="text-xs font-semibold text-content-heading hover:underline">
                      Ver receta
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onInitiateConsumption(recipe);
                      }}
                      className="tomorro-btn-primary min-h-[36px] text-xs px-3.5 py-1.5 font-semibold"
                    >
                      <Check size={14} strokeWidth={2.6} /> Aproveché
                    </button>
                  </div>
                </div>
              ))}
            </div>

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
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-xs text-content-muted">
          <span>
            {activeTab === "whatCanICook"
              ? "Ideas preparadas para responder al instante según el inventario de tu hogar."
              : "Sugerencias basadas en tus productos por vencer."}
          </span>
          <span className="flex items-center gap-1">
            <Utensils size={13} /> FreshTrack Cocina
          </span>
        </div>
      </div>
    </section>
  );
}
