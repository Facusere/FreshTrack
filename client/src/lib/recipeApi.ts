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
  { id: "fallback-ensalada", title: "Ensalada tibia de verduras", image: "https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg", matchedIngredients: ["Tomates cherry", "Espinaca fresca"], source: "FreshTrack" },
  { id: "fallback-arroz", title: "Arroz salteado de heladera", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Arroz largo fino", "Cebolla"], source: "FreshTrack" },
  { id: "fallback-huevos", title: "Huevos revueltos con verdes", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Huevos", "Espinaca fresca"], source: "FreshTrack" },
  { id: "fallback-sopa", title: "Sopa rápida de verduras", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Verduras", "Cebolla"], source: "FreshTrack" },
  { id: "fallback-papas", title: "Papas al horno con hierbas", image: "https://www.themealdb.com/images/media/meals/1549542994.jpg", matchedIngredients: ["Papas", "Aceite"], source: "FreshTrack" },
  { id: "fallback-tostada", title: "Tostada de palta y tomate", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Pan", "Palta", "Tomates cherry"], source: "FreshTrack" },
  { id: "fallback-yogur", title: "Yogur con fruta y avena", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Yogur natural", "Frutas"], source: "FreshTrack" },
  { id: "fallback-legumbres", title: "Ensalada de lentejas", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Lentejas", "Tomates cherry"], source: "FreshTrack" },
  { id: "fallback-pollo-horno", title: "Pollo al horno con papas", image: "https://www.themealdb.com/images/media/meals/1529444830.jpg", matchedIngredients: ["Pechuga de pollo", "Papas"], source: "FreshTrack" },
];

const spanishInstructionMap: Array<[RegExp, string]> = [
  [/preheat|heat the oven/i, "Precalentá el horno"], [/chop|slice|dice/i, "Cortá los ingredientes"], [/add|place|put/i, "Agregá los ingredientes"], [/mix|stir|combine/i, "Mezclá todo"], [/cook|fry|saute/i, "Cociná a fuego medio"], [/bake|roast/i, "Horneá hasta que esté dorado"], [/boil/i, "Herví hasta que esté tierno"], [/season/i, "Condimentá a gusto"], [/serve/i, "Serví caliente"], [/remove from heat/i, "Retirá del fuego"],
];

const spanishFoodWords: Record<string, string> = {
  spinach: "espinaca", tomato: "tomate", tomatoes: "tomates", onion: "cebolla", onions: "cebollas", chicken: "pollo", beef: "carne vacuna", pork: "cerdo", salmon: "salmón", fish: "pescado", tuna: "atún", potato: "papa", potatoes: "papas", egg: "huevo", eggs: "huevos", milk: "leche", cream: "crema", cheese: "queso", butter: "manteca", bread: "pan", flour: "harina", rice: "arroz", pasta: "pasta", oil: "aceite", salt: "sal", pepper: "pimienta", water: "agua", curry: "curry", powder: "en polvo", fresh: "fresco", salad: "ensalada", soup: "sopa", beans: "porotos", lentils: "lentejas", avocado: "palta", oats: "avena", fruit: "fruta", vegetables: "verduras", vegetable: "verdura",
};

const knownTitleTranslations: Record<string, string> = {
  "curried spinach from botswana": "Espinaca al curry de Botswana",
  "potato gratin with chicken": "Gratín de papas con pollo",
  "salmon avocado salad": "Ensalada de salmón y palta",
  "algerian bouzgene berber bread with roasted pepper sauce": "Pan bereber argelino con salsa de morrones asados",
  "arepa pabellón": "Arepa pabellón",
};

function translateFoodText(value: string) {
  return value.split(/(\s+)/).map((part) => spanishFoodWords[part.toLowerCase()] || part).join("");
}

function translateRecipeTitle(value: string) {
  return knownTitleTranslations[value.toLowerCase()] || translateFoodText(value);
}

function translateInstructions(instructions?: string) {
  if (!instructions) return "Prepará los ingredientes, cociná hasta que estén tiernos y serví caliente.";
  return instructions.split(/\r?\n+/).filter(Boolean).map((step) => {
    const translated = spanishInstructionMap.find(([pattern]) => pattern.test(step))?.[1];
    return translated ? `${translated}.` : "Continuá la preparación hasta integrar bien los ingredientes.";
  }).join("\n");
}

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
      else deduped.set(meal.idMeal, { id: meal.idMeal, title: translateRecipeTitle(meal.strMeal), image: meal.strMealThumb, matchedIngredients: [meal.matchedIngredient], source: "TheMealDB", url: `https://www.themealdb.com/meal.php?c=${meal.idMeal}` });
    });
    const results = Array.from(deduped.values()).sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length).slice(0, 12);
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
  const ingredients = Array.from({ length: 20 }, (_, index) => index + 1).map((index) => ({ name: translateFoodText(meal[`strIngredient${index}`]?.trim() || ""), measure: meal[`strMeasure${index}`]?.trim() || "" })).filter((item) => item.name);
  return { ...recipe, title: translateRecipeTitle(meal.strMeal), area: meal.strArea, category: meal.strCategory, ingredients, instructions: translateInstructions(meal.strInstructions) };
}
