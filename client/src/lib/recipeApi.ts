export type RecipeSuggestion = {
  id: string;
  title: string;
  image: string;
  area?: string;
  category?: string;
  matchedIngredients: string[];
  source: "TheMealDB" | "FreshTrack";
  url?: string;
  ingredients?: Array<{ name: string; measure: string }>;
  instructions?: string;
};

type MealFilterResponse = { meals?: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null };
type MealDetail = { idMeal: string; strMeal: string; strMealThumb: string; strArea?: string; strCategory?: string; strInstructions?: string; [key: string]: string | undefined };

const ingredientAliases: Record<string, string> = {
  "espinaca fresca": "spinach",
  "tomates cherry": "tomato",
  "tomate redondo": "tomato",
  "pechuga de pollo": "chicken_breast",
  "pollo entero": "chicken",
  "leche entera": "milk",
  "huevo": "egg",
  "papas": "potatoes",
  "cebolla": "onion",
  "arroz largo fino": "rice",
  "pasta seca": "pasta",
};

const fallbackRecipes: RecipeSuggestion[] = [
  { id: "fallback-tortilla", title: "Tortilla verde de aprovechamiento", image: "https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg", matchedIngredients: ["Espinaca fresca", "Huevos"], source: "FreshTrack" },
  { id: "fallback-pollo", title: "Pollo salteado con verduras", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Pechuga de pollo", "Tomates cherry"], source: "FreshTrack" },
  { id: "fallback-pasta", title: "Pasta cremosa con lo que hay", image: "https://www.themealdb.com/images/media/meals/ustsqw1511384527.jpg", matchedIngredients: ["Pasta seca", "Leche entera"], source: "FreshTrack" },
];

function toApiIngredient(name: string) {
  const normalized = name.toLowerCase().trim();
  return ingredientAliases[normalized] || normalized.replace(/\s+/g, "_");
}

export async function searchRecipesByIngredients(ingredients: string[], signal?: AbortSignal): Promise<RecipeSuggestion[]> {
  const usable = ingredients.filter(Boolean).slice(0, 4);
  if (!usable.length) return fallbackRecipes;
  try {
    const responses = await Promise.all(usable.map(async (ingredient) => {
      const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(toApiIngredient(ingredient))}`, { signal });
      if (!response.ok) throw new Error("TheMealDB no respondió");
      const data = await response.json() as MealFilterResponse;
      return (data.meals || []).slice(0, 5).map((meal) => ({ ...meal, matchedIngredient: ingredient }));
    }));
    const deduped = new Map<string, RecipeSuggestion>();
    responses.flat().forEach((meal) => {
      const current = deduped.get(meal.idMeal);
      if (current) current.matchedIngredients = Array.from(new Set([...current.matchedIngredients, meal.matchedIngredient]));
      else deduped.set(meal.idMeal, { id: meal.idMeal, title: meal.strMeal, image: meal.strMealThumb, matchedIngredients: [meal.matchedIngredient], source: "TheMealDB", url: `https://www.themealdb.com/meal.php?c=${meal.idMeal}` });
    });
    const results = Array.from(deduped.values()).sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length).slice(0, 3);
    return results.length ? results : fallbackRecipes;
  } catch {
    return fallbackRecipes;
  }
}

export async function getRecipeDetails(recipe: RecipeSuggestion, signal?: AbortSignal): Promise<RecipeSuggestion> {
  if (recipe.source === "FreshTrack") return recipe;
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipe.id}`, { signal });
  if (!response.ok) throw new Error("No se pudo cargar el detalle");
  const data = await response.json() as { meals?: MealDetail[] | null };
  const meal = data.meals?.[0];
  if (!meal) return recipe;
  const ingredients = Array.from({ length: 20 }, (_, index) => index + 1).map((index) => ({ name: meal[`strIngredient${index}`]?.trim() || "", measure: meal[`strMeasure${index}`]?.trim() || "" })).filter((item) => item.name);
  return { ...recipe, area: meal.strArea, category: meal.strCategory, ingredients, instructions: meal.strInstructions };
}
