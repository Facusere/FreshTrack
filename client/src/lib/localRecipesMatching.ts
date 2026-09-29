import localRecipesData from "@/data/localRecipes.json";
import { findBestMatchingItem } from "./ingredientMatching";
import { Product, StoredProduct } from "@/types/product";
import { daysUntil } from "./dates";
import { searchRecipesByExpiring } from "./recipeApi";

export type LocalRecipeIngredient = {
  name: string;
  quantity?: string;
};

export type LocalRecipe = {
  id: string;
  name: string;
  category: string;
  ingredients: LocalRecipeIngredient[];
  instructions: string[];
  image?: string;
  tags?: string[];
  isOnline?: boolean;
};

export type RecipeMatchResult = {
  recipe: LocalRecipe;
  matchedIngredients: string[];
  missingIngredients: LocalRecipeIngredient[];
  matchRatio: {
    matched: number;
    total: number;
    percentage: number;
  };
  tier: "ready" | "almost" | "more"; // "Podés hacer ahora" (100%), "Te falta poco" (80%+), "Necesitás comprar más" (<80%)
};

export type GroupedRecipeMatches = {
  ready: RecipeMatchResult[];
  almost: RecipeMatchResult[];
  more: RecipeMatchResult[];
  totalEligible: number;
};

export const LOCAL_RECIPES: LocalRecipe[] = localRecipesData as LocalRecipe[];

/**
 * Evalúa una receta contra los productos de la despensa (excluyendo vencidos).
 * Función pura, no realiza peticiones de red ni llamadas a APIs externas.
 */
export function matchRecipeAgainstPantry(
  recipe: LocalRecipe,
  pantry: Array<Product | StoredProduct>,
  today: Date = new Date()
): RecipeMatchResult {
  const activePantry = pantry.filter((item) => {
    if ("status" in item && item.status === "expired") return false;
    if (item.expiryDate && daysUntil(item.expiryDate, today) < 0) return false;
    return true;
  });

  const matchedIngredients: string[] = [];
  const missingIngredients: LocalRecipeIngredient[] = [];

  for (const ing of recipe.ingredients) {
    const match = findBestMatchingItem(activePantry, { name: ing.name });
    if (match) {
      matchedIngredients.push(ing.name);
    } else {
      missingIngredients.push(ing);
    }
  }

  const total = recipe.ingredients.length;
  const matched = matchedIngredients.length;
  const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;

  let tier: "ready" | "almost" | "more" = "more";
  if (percentage === 100) {
    tier = "ready";
  } else if (percentage >= 80) {
    tier = "almost";
  } else {
    tier = "more";
  }

  return {
    recipe,
    matchedIngredients,
    missingIngredients,
    matchRatio: {
      matched,
      total,
      percentage,
    },
    tier,
  };
}

/**
 * Calcula instantáneamente los matches para todas las recetas locales.
 * Si la despensa tiene menos de 3 productos no vencidos, retorna null (estado vacío C6).
 */
export function calculateLocalRecipeMatches(
  pantry: Array<Product | StoredProduct>,
  recipes: LocalRecipe[] = LOCAL_RECIPES,
  today: Date = new Date()
): GroupedRecipeMatches | null {
  const nonExpired = pantry.filter((item) => {
    if ("status" in item && item.status === "expired") return false;
    if (item.expiryDate && daysUntil(item.expiryDate, today) < 0) return false;
    return true;
  });

  // C6: Menos de 3 productos en despensa -> no calcular
  if (nonExpired.length < 3) {
    return null;
  }

  const ready: RecipeMatchResult[] = [];
  const almost: RecipeMatchResult[] = [];
  const more: RecipeMatchResult[] = [];

  for (const recipe of recipes) {
    const result = matchRecipeAgainstPantry(recipe, nonExpired, today);
    if (result.tier === "ready") {
      ready.push(result);
    } else if (result.tier === "almost") {
      almost.push(result);
    } else {
      more.push(result);
    }
  }

  const sorter = (a: RecipeMatchResult, b: RecipeMatchResult) => {
    if (b.matchRatio.percentage !== a.matchRatio.percentage) {
      return b.matchRatio.percentage - a.matchRatio.percentage;
    }
    return b.matchRatio.matched - a.matchRatio.matched;
  };

  ready.sort(sorter);
  almost.sort(sorter);
  more.sort(sorter);

  return {
    ready,
    almost,
    more,
    totalEligible: ready.length + almost.length + more.length,
  };
}

// In-memory cache for online recipe searches (C4)
let cachedOnlineResults: LocalRecipe[] | null = null;
let cachedPantryFingerprint: string | null = null;

export function getCachedOnlineRecipes(pantry: Array<Product | StoredProduct>): LocalRecipe[] | null {
  const fingerprint = pantry
    .map((p) => `${p.name}:${p.expiryDate}`)
    .sort()
    .join("|");
  if (cachedOnlineResults && cachedPantryFingerprint === fingerprint) {
    return cachedOnlineResults;
  }
  return null;
}

export function setCachedOnlineRecipes(
  pantry: Array<Product | StoredProduct>,
  recipes: LocalRecipe[]
): void {
  const fingerprint = pantry
    .map((p) => `${p.name}:${p.expiryDate}`)
    .sort()
    .join("|");
  cachedPantryFingerprint = fingerprint;
  cachedOnlineResults = recipes;
}

export function clearOnlineRecipeCache(): void {
  cachedOnlineResults = null;
  cachedPantryFingerprint = null;
}

/**
 * Dispara búsqueda online contra TheMealDB y cachea los resultados.
 * Solo se llama cuando el usuario toca explícitamente el botón (C4).
 */
export async function fetchOnlineRecipesForPantry(
  pantry: Product[],
  signal?: AbortSignal
): Promise<LocalRecipe[]> {
  const cached = getCachedOnlineRecipes(pantry);
  if (cached) {
    return cached;
  }

  const searchResult = await searchRecipesByExpiring(pantry, signal);
  const converted: LocalRecipe[] = searchResult.recipes.map((r) => ({
    id: `online-${r.id}`,
    name: r.title,
    category: r.category || "Online",
    ingredients: (r.ingredients && r.ingredients.length > 0)
      ? r.ingredients.map((ing) => ({ name: ing.name, quantity: ing.measure }))
      : r.matchedIngredients.map((name) => ({ name, quantity: "a gusto" })),
    instructions: r.instructions
      ? r.instructions.split(/\r?\n+/).filter(Boolean)
      : ["Preparar los ingredientes, cocinar a fuego medio y servir caliente."],
    image: r.image,
    isOnline: true,
    tags: ["online", "themealdb", r.category].filter(Boolean) as string[],
  }));

  setCachedOnlineRecipes(pantry, converted);
  return converted;
}
