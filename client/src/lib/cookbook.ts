import { LocalRecipe, RecipeMatchResult } from "./localRecipesMatching";
import { normalizeText } from "./ingredientMatching";
import { isGlutenFreeEstimated } from "./recipeApi";

export type CookbookDietaryFilter = "all" | "vegetarian" | "glutenFree" | "quick";
export type CookbookSort = "alphabetical" | "pantryMatch" | "favoritesFirst";

export interface CookbookOptions {
  searchQuery?: string;
  category?: string;
  onlyFavorites?: boolean;
  onlyAvailablePantry?: boolean;
  dietary?: CookbookDietaryFilter;
  sortBy?: CookbookSort;
  favoriteIds?: Set<string> | string[];
  matchesMap?: Map<string, RecipeMatchResult>;
}

const NON_VEGETARIAN_REGEX =
  /\b(chicken|pollos?|beef|carnes?|pork|cerdos?|bacon|pancetas?|jamon(?:es)?|jamón(?:es)?|salames?|chorizos?|morcillas?|salmon(?:es)?|salmón(?:es)?|fish|pescados?|tuna|atun(?:es)?|atún(?:es)?|meats?|milanesas?|patys?|hamburguesas?|nalga|peceto|lomo|bife|asado|costillitas?|bondiola)\b/i;

const QUICK_RECIPE_REGEX =
  /\b(rapida|rápida|facil|fácil|express|ensalada|omelette|tortilla|sandwich|sándwich|tostada|wrap|salteado|panqueque)\b/i;

export function recipeMatchesDietary(
  recipe: LocalRecipe,
  dietary: CookbookDietaryFilter
): boolean {
  if (dietary === "all") return true;

  if (dietary === "glutenFree") {
    return isGlutenFreeEstimated(recipe.ingredients);
  }

  const combinedText = `${recipe.name} ${recipe.category} ${(recipe.tags || []).join(" ")} ${recipe.ingredients.map((i) => i.name).join(" ")}`;

  if (dietary === "vegetarian") {
    if (recipe.tags?.some((t) => /vegetari/i.test(t))) return true;
    return !NON_VEGETARIAN_REGEX.test(combinedText);
  }

  if (dietary === "quick") {
    if (recipe.tags?.some((t) => /rap|quick|express/i.test(t))) return true;
    return QUICK_RECIPE_REGEX.test(combinedText) || recipe.instructions.length <= 4;
  }

  return true;
}

/**
 * Extrae todas las categorías únicas presentes en la lista de recetas, ordenadas alfabéticamente.
 */
export function getCookbookCategories(recipes: LocalRecipe[]): string[] {
  const categories = new Set<string>();
  for (const recipe of recipes) {
    if (recipe.category && recipe.category.trim()) {
      categories.add(recipe.category.trim());
    }
  }
  return ["Todas", ...Array.from(categories).sort((a, b) => a.localeCompare(b, "es"))];
}

/**
 * Filtra y ordena recetas locales según los criterios de búsqueda, categorías, despensa y favoritos.
 * Función pura y testeable sin llamadas a red ni efectos secundarios.
 */
export function filterAndSortCookbook(
  recipes: LocalRecipe[],
  options: CookbookOptions = {}
): LocalRecipe[] {
  const {
    searchQuery = "",
    category = "Todas",
    onlyFavorites = false,
    onlyAvailablePantry = false,
    dietary = "all",
    sortBy = "alphabetical",
    favoriteIds,
    matchesMap,
  } = options;

  const normalizedQuery = normalizeText(searchQuery);
  const favSet = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds || []);

  const filtered = recipes.filter((recipe) => {
    // 1. Filtro por categoría
    if (category && category !== "Todas" && recipe.category !== category) {
      return false;
    }

    // 2. Filtro solo favoritas
    if (onlyFavorites && !favSet.has(recipe.id)) {
      return false;
    }

    // 3. Filtro según despensa (solo las que se pueden hacer ahora: tier ready 100%)
    if (onlyAvailablePantry) {
      const match = matchesMap?.get(recipe.id);
      if (!match || match.tier !== "ready") {
        return false;
      }
    }

    // 4. Filtro dietario (vegetariano, sin gluten, rápida)
    if (!recipeMatchesDietary(recipe, dietary)) {
      return false;
    }

    // 5. Búsqueda normalizada por nombre o ingrediente
    if (normalizedQuery) {
      const normalizedName = normalizeText(recipe.name);
      if (normalizedName.includes(normalizedQuery)) {
        return true;
      }

      const matchesIngredient = recipe.ingredients.some((ing) =>
        normalizeText(ing.name).includes(normalizedQuery)
      );
      if (!matchesIngredient) {
        return false;
      }
    }

    return true;
  });

  // Ordenamiento
  const sorted = [...filtered];

  sorted.sort((a, b) => {
    const isFavA = favSet.has(a.id);
    const isFavB = favSet.has(b.id);

    if (sortBy === "favoritesFirst") {
      if (isFavA !== isFavB) {
        return isFavA ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    }

    if (sortBy === "pantryMatch") {
      const matchA = matchesMap?.get(a.id);
      const matchB = matchesMap?.get(b.id);

      const pctA = matchA?.matchRatio.percentage ?? 0;
      const pctB = matchB?.matchRatio.percentage ?? 0;

      if (pctB !== pctA) {
        return pctB - pctA;
      }

      const countA = matchA?.matchRatio.matched ?? 0;
      const countB = matchB?.matchRatio.matched ?? 0;
      if (countB !== countA) {
        return countB - countA;
      }

      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    }

    // Por defecto: alfabético
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });

  return sorted;
}
