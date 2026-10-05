import React, { useMemo, useState, useEffect } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  Heart,
  Search,
  Utensils,
  X,
} from "lucide-react";
import { LocalRecipe, LOCAL_RECIPES, RecipeMatchResult, matchRecipeAgainstPantry } from "@/lib/localRecipesMatching";
import {
  filterAndSortCookbook,
  getCookbookCategories,
  CookbookDietaryFilter,
  CookbookSort,
} from "@/lib/cookbook";
import {
  loadFavorites,
  saveFavorites,
  toggleFavorite,
} from "@/lib/favoriteRecipes";
import {
  loadMealPlan,
  saveMealPlan,
  PlannedMeal,
  MealSlot,
  setMealSlot,
} from "@/lib/mealPlan";
import { RecipeCard } from "./RecipeCard";
import { RecipeDetailDialog } from "./RecipeDetailDialog";
import { MealPlanner } from "./MealPlanner";
import { Product } from "@/types/product";
import { ShoppingItem } from "@/lib/shoppingList";

export interface CookbookSectionProps {
  pantryProducts?: Product[];
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  onAddMissingToShoppingList?: (
    recipeTitle: string,
    missing: Array<{ name: string; quantity?: string }>
  ) => void;
  onInitiateConsumption?: (recipe: any) => void;
  onNavigateToShopping?: () => void;
}

const RECIPES_PER_PAGE = 12;

export function CookbookSection({
  pantryProducts = [],
  shoppingList,
  setShoppingList,
  onAddMissingToShoppingList,
  onInitiateConsumption,
  onNavigateToShopping,
}: CookbookSectionProps) {
  // State for Favorites & MealPlan loaded safely from localStorage
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(LOCAL_RECIPES));
  const [mealPlan, setMealPlan] = useState<PlannedMeal[]>(() => loadMealPlan(LOCAL_RECIPES));

  // Sync to localStorage on change
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveMealPlan(mealPlan);
  }, [mealPlan]);

  // View state: Cookbook vs Weekly Meal Planner
  const [activeSubView, setActiveSubView] = useState<"catalog" | "planner">("catalog");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyAvailablePantry, setOnlyAvailablePantry] = useState(false);
  const [dietaryFilter, setDietaryFilter] = useState<CookbookDietaryFilter>("all");
  const [sortBy, setSortBy] = useState<CookbookSort>("alphabetical");

  // Pagination limit
  const [visibleLimit, setVisibleLimit] = useState(RECIPES_PER_PAGE);

  // Selected recipe for Detail Dialog
  const [selectedRecipe, setSelectedRecipe] = useState<LocalRecipe | null>(null);

  // Dynamic categories from data
  const categories = useMemo(() => {
    return getCookbookCategories(LOCAL_RECIPES);
  }, []);

  // Compute pantry matches map for all LOCAL_RECIPES
  const matchesMap = useMemo(() => {
    const map = new Map<string, RecipeMatchResult>();
    for (const r of LOCAL_RECIPES) {
      map.set(r.id, matchRecipeAgainstPantry(r, pantryProducts));
    }
    return map;
  }, [pantryProducts]);

  // Filtered and sorted recipes
  const filteredRecipes = useMemo(() => {
    return filterAndSortCookbook(LOCAL_RECIPES, {
      searchQuery,
      category: selectedCategory,
      onlyFavorites,
      onlyAvailablePantry,
      dietary: dietaryFilter,
      sortBy,
      favoriteIds: favorites,
      matchesMap,
    });
  }, [
    searchQuery,
    selectedCategory,
    onlyFavorites,
    onlyAvailablePantry,
    dietaryFilter,
    sortBy,
    favorites,
    matchesMap,
  ]);

  // Reset pagination when filter changes
  useEffect(() => {
    setVisibleLimit(RECIPES_PER_PAGE);
  }, [searchQuery, selectedCategory, onlyFavorites, onlyAvailablePantry, dietaryFilter, sortBy]);

  const displayedRecipes = useMemo(() => {
    return filteredRecipes.slice(0, visibleLimit);
  }, [filteredRecipes, visibleLimit]);

  // Handlers
  const handleToggleFavorite = (recipeId: string) => {
    setFavorites((prev) => toggleFavorite(recipeId, prev));
  };

  const handleCookFromRecipe = (recipe: LocalRecipe) => {
    if (!onInitiateConsumption) return;
    // Map LocalRecipe to format expected by initiateConsumption
    const suggestion = {
      id: recipe.id,
      title: recipe.name,
      category: recipe.category,
      matchedIngredients: recipe.ingredients.map((i) => i.name),
      ingredients: recipe.ingredients.map((i) => ({
        name: i.name,
        measure: i.quantity || "a gusto",
      })),
      instructions: recipe.instructions.join("\n"),
    };
    onInitiateConsumption(suggestion);
  };

  const handlePlanMeal = (
    recipe: LocalRecipe,
    date: string,
    slot: MealSlot,
    portions: number
  ) => {
    setMealPlan((prev) => setMealSlot(prev, recipe.id, date, slot, portions));
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: SubView switcher (Catálogo vs Planificador) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-subtle/50 p-2.5 rounded-2xl border border-line">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView("catalog")}
            className={`min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubView === "catalog"
                ? "bg-brand text-white shadow-xs"
                : "text-content-muted hover:text-content-heading hover:bg-surface"
            }`}
          >
            <BookOpen size={15} /> Recetario ({filteredRecipes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView("planner")}
            className={`min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubView === "planner"
                ? "bg-brand text-white shadow-xs"
                : "text-content-muted hover:text-content-heading hover:bg-surface"
            }`}
          >
            <Calendar size={15} /> Planificador semanal
            {mealPlan.length > 0 && (
              <span className="rounded-full bg-surface/30 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                {mealPlan.length}
              </span>
            )}
          </button>
        </div>

        {activeSubView === "catalog" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-content-muted font-semibold hidden sm:inline">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CookbookSort)}
              className="rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-content-heading"
            >
              <option value="alphabetical">Alfabético (A-Z)</option>
              <option value="pantryMatch">Más completas con mi despensa</option>
              <option value="favoritesFirst">Favoritas primero</option>
            </select>
          </div>
        )}
      </div>

      {activeSubView === "planner" ? (
        <MealPlanner
          mealPlan={mealPlan}
          setMealPlan={setMealPlan}
          recipes={LOCAL_RECIPES}
          pantryProducts={pantryProducts}
          shoppingList={shoppingList}
          setShoppingList={setShoppingList}
          onOpenRecipeDetail={(recipe) => setSelectedRecipe(recipe)}
          onNavigateToShopping={onNavigateToShopping}
        />
      ) : (
        <>
          {/* Search & Filters */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted"
              />
              <input
                type="text"
                placeholder="Buscar recetas por nombre o ingredientes (ej. pollo, lentejas, milanesa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-line bg-surface pl-10 pr-9 py-2.5 text-xs font-semibold text-content-heading placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-focus"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-heading"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Category Selector */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-content-heading hover:bg-surface-elevated transition"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "Todas" ? "Todas las categorías" : c}
                  </option>
                ))}
              </select>

              {/* Favoritas */}
              <button
                type="button"
                onClick={() => setOnlyFavorites((prev) => !prev)}
                className={`flex min-h-[34px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition ${
                  onlyFavorites
                    ? "bg-rose-500 text-white shadow-xs ring-1 ring-rose-300"
                    : "border border-line bg-surface text-content-body hover:bg-surface-elevated"
                }`}
              >
                <Heart size={13} className={onlyFavorites ? "fill-current" : ""} />
                Favoritas ({favorites.length})
              </button>

              {/* Puedo hacerla con mi despensa */}
              <button
                type="button"
                onClick={() => setOnlyAvailablePantry((prev) => !prev)}
                className={`flex min-h-[34px] items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition ${
                  onlyAvailablePantry
                    ? "bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-300"
                    : "border border-line bg-surface text-content-body hover:bg-surface-elevated"
                }`}
              >
                <Check size={13} strokeWidth={2.6} /> Puedo hacerla ahora
              </button>

              {/* Dietary filters */}
              <div className="flex items-center gap-1 border-l border-line pl-2 ml-1">
                {(
                  [
                    ["all", "Todas"],
                    ["vegetarian", "Vegetarianas"],
                    ["glutenFree", "Sin TACC"],
                    ["quick", "Rápidas"],
                  ] as Array<[CookbookDietaryFilter, string]>
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDietaryFilter(val)}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                      dietaryFilter === val
                        ? "bg-brand text-white font-bold"
                        : "text-content-muted hover:text-content-heading hover:bg-surface-elevated"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipes Grid */}
          {displayedRecipes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  matchResult={matchesMap.get(recipe.id)}
                  isFavorite={favorites.includes(recipe.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenDetail={(r) => setSelectedRecipe(r)}
                  onQuickCook={(r) => handleCookFromRecipe(r)}
                  onAddMissingToShopping={onAddMissingToShoppingList}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface-subtle/50 py-12 px-4 text-center">
              <Utensils className="mx-auto text-content-muted" size={36} />
              <h4 className="mt-3 font-display text-base font-bold text-content-heading">
                No encontramos recetas que coincidan
              </h4>
              <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
                Probá cambiando los filtros o la búsqueda para ver más preparaciones del recetario.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Todas");
                  setOnlyFavorites(false);
                  setOnlyAvailablePantry(false);
                  setDietaryFilter("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-brand-border bg-brand-subtle px-3.5 py-1.5 text-xs font-bold text-brand-text hover:bg-surface transition"
              >
                Restablecer filtros
              </button>
            </div>
          )}

          {/* Load More Button */}
          {visibleLimit < filteredRecipes.length && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleLimit((l) => l + RECIPES_PER_PAGE)}
                className="btn-3d min-h-[44px] rounded-xl border border-line bg-surface px-6 py-2.5 text-xs font-bold text-content-heading hover:bg-surface-elevated transition"
              >
                Cargar más recetas ({filteredRecipes.length - visibleLimit} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {/* Recipe Detail Dialog */}
      <RecipeDetailDialog
        recipe={selectedRecipe}
        isOpen={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        matchResult={selectedRecipe ? matchesMap.get(selectedRecipe.id) : undefined}
        isFavorite={selectedRecipe ? favorites.includes(selectedRecipe.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onAddMissingToShopping={onAddMissingToShoppingList}
        onCookRecipe={handleCookFromRecipe}
        onPlanMeal={handlePlanMeal}
        pantry={pantryProducts}
        onNavigateToShopping={onNavigateToShopping}
      />
    </div>
  );
}
