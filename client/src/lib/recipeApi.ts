import { findMatchingPantryItem } from "./ingredientMatching.js";

export type RecipeIngredient = {
  name: string;
  measure: string;
};

export type RecipeSuggestion = {
  id: string;
  title: string;
  image: string;
  area?: string;
  category?: string;
  matchedIngredients: string[];
  source: "TheMealDB" | "FreshTrack";
  url?: string;
  ingredients?: RecipeIngredient[];
  instructions?: string;
  isLocalFallback?: boolean;
  isOriginalEnglish?: boolean;
  isGlutenFreeEstimated?: boolean;
  pantryMatchRatio?: { matched: number; total: number };
  sourceLanguage?: string;
};

export type RecipeSearchResult = {
  recipes: RecipeSuggestion[];
  warning?: string | null;
  info?: string | null;
  error?: string | null;
  isLocalFallback?: boolean;
};

type MealFilterResponse = {
  meals?: Array<{ idMeal: string; strMeal: string; strMealThumb: string }> | null;
};

type MealDetail = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strArea?: string;
  strCategory?: string;
  strInstructions?: string;
  [key: string]: string | undefined;
};

const RECIPE_I18N_STORAGE_KEY = "freshtrack-recipe-i18n-v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in memory

type SearchCacheEntry = {
  timestamp: number;
  recipes: RecipeSuggestion[];
};

const searchMemoryCache = new Map<string, SearchCacheEntry>();

const ingredientAliases: Record<string, string> = {
  "espinaca": "spinach",
  "espinaca fresca": "spinach",
  "tomate": "tomato",
  "tomates": "tomato",
  "tomates cherry": "tomato",
  "tomate redondo": "tomato",
  "pechuga de pollo": "chicken_breast",
  "pollo": "chicken",
  "pollo entero": "chicken",
  "leche": "milk",
  "leche entera": "milk",
  "huevo": "egg",
  "huevos": "egg",
  "papa": "potatoes",
  "papas": "potatoes",
  "cebolla": "onion",
  "cebollas": "onion",
  "arroz": "rice",
  "arroz largo fino": "rice",
  "pasta": "pasta",
  "pasta seca": "pasta",
  "fideos": "pasta",
  "harina": "flour",
  "carne": "beef",
  "queso": "cheese",
  "atun": "tuna",
  "atún": "tuna",
  "zanahoria": "carrot",
  "zanahorias": "carrot",
  "palta": "avocado",
  "avena": "oats",
  "yogur": "yogurt",
  "lentejas": "lentils",
};

/**
 * Checks if a recipe's ingredients are estimated to be gluten-free.
 * Detects presence of wheat, barley, rye, oats, flour, pasta, bread, etc.
 */
export function isGlutenFreeEstimated(
  ingredients?: Array<{ name: string; measure?: string } | string>
): boolean {
  if (!ingredients || ingredients.length === 0) return false;

  const glutenRegex =
    /\b(harina|fideos?|pastas?|pan(?:es)?|avena|trigo|centeno|cebada|wheat|barley|rye|oats?|flour|bread|noodles?)\b/i;

  for (const item of ingredients) {
    const name = typeof item === "string" ? item : item.name;
    if (glutenRegex.test(name)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns an SVG data URI with an appropriate emoji and gradient background
 * for recipes when external images are unavailable or fail to load.
 */
export function getRecipeFallbackImage(title: string, category?: string): string {
  const text = `${title} ${category || ""}`.toLowerCase();
  let emoji = "🍲";
  if (/ensalada|salad/i.test(text)) emoji = "🥗";
  else if (/pollo|chicken/i.test(text)) emoji = "🍗";
  else if (/pasta|fideo|spaghetti/i.test(text)) emoji = "🍝";
  else if (/arroz|rice/i.test(text)) emoji = "🍚";
  else if (/huevo|egg|tortilla|revuelto/i.test(text)) emoji = "🍳";
  else if (/papa|patata|potato/i.test(text)) emoji = "🥔";
  else if (/tostada|pan|toast|sandwich/i.test(text)) emoji = "🥪";
  else if (/yogur|yogurt|postre|avena/i.test(text)) emoji = "🥣";
  else if (/sopa|soup|caldo/i.test(text)) emoji = "🍲";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f1eadc"/>
        <stop offset="100%" stop-color="#dfd2be"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="24" fill="url(#g)"/>
    <text x="50%" y="56%" font-size="80" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const fallbackRecipes: RecipeSuggestion[] = [
  {
    id: "fallback-tortilla",
    title: "Tortilla verde de aprovechamiento",
    image: "https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg",
    matchedIngredients: ["Espinaca", "Huevos"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "espinaca", measure: "1 atado lavado" },
      { name: "huevos", measure: "3 unidades" },
      { name: "cebolla", measure: "1/2 unidad picada" },
      { name: "aceite", measure: "2 cucharadas" },
      { name: "sal y pimienta", measure: "a gusto" },
    ],
    instructions:
      "Lavá y picá la espinaca y la cebolla.\nSalteá la cebolla en una sartén con aceite hasta transparentar.\nSumá la espinaca y cociná por 2 minutos hasta que reduzca su volumen.\nBatí los huevos con sal y pimienta, e incorporá la verdura salteada.\nVolcá en la sartén caliente y cociná 4 minutos por lado hasta que cuaje bien.",
  },
  {
    id: "fallback-pollo",
    title: "Pollo salteado con verduras",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Pechuga de pollo", "Tomates cherry"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "pechuga de pollo", measure: "2 bifes cortados en tiras" },
      { name: "tomates cherry", measure: "1 taza cortados al medio" },
      { name: "aceite", measure: "1 cucharada" },
      { name: "ajo", measure: "1 diente picado" },
      { name: "sal y orégano", measure: "a gusto" },
    ],
    instructions:
      "Cortá el pollo en tiras finas y condimentá con sal y ajo picado.\nCalentá una sartén con aceite a fuego medio-alto y sellá el pollo por 5 minutos.\nAgregá los tomates cherry y salteá 3 minutos hasta que suelten jugo.\nCondimentá con orégano y serví recién preparado.",
  },
  {
    id: "fallback-pasta",
    title: "Pasta cremosa con lo que hay",
    image: "https://www.themealdb.com/images/media/meals/ustsqw1511384527.jpg",
    matchedIngredients: ["Pasta seca", "Leche entera"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "pasta seca", measure: "200 gramos" },
      { name: "leche entera", measure: "1 taza" },
      { name: "queso", measure: "50 gramos rallado" },
      { name: "manteca o aceite", measure: "1 cucharada" },
      { name: "sal y nuez moscada", measure: "a gusto" },
    ],
    instructions:
      "Herví la pasta en abundante agua con sal hasta que esté al dente.\nEn una ollita derretí la manteca, sumá la leche caliente y el queso rallado.\nMezclá a fuego bajo hasta que se forme una salsa cremosa.\nEscurrí la pasta, mezclala con la salsa y serví con un toque de pimienta.",
  },
  {
    id: "fallback-ensalada",
    title: "Ensalada tibia de verduras",
    image: "https://www.themealdb.com/images/media/meals/wvqpwt1468339226.jpg",
    matchedIngredients: ["Tomates cherry", "Espinaca"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "tomates cherry", measure: "150 gramos" },
      { name: "espinaca fresca", measure: "1 atado tierno" },
      { name: "aceite de oliva", measure: "2 cucharadas" },
      { name: "semillas o frutos secos", measure: "1 puñado" },
      { name: "aceto o vinagre", measure: "1 cucharadita" },
    ],
    instructions:
      "Lavá y secá bien las hojas de espinaca fresca.\nSalteá los tomates cherry en una sartén caliente con aceite de oliva 2 minutos.\nColocá la espinaca en un bol y volcá los tomates tibios por encima.\nTerminá con semillas tostadas y un aderezo suave.",
  },
  {
    id: "fallback-arroz",
    title: "Arroz salteado de heladera",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Arroz", "Cebolla"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "arroz cocido", measure: "2 tazas sobrantes" },
      { name: "cebolla", measure: "1 unidad picada" },
      { name: "huevo", measure: "1 o 2 unidades" },
      { name: "aceite", measure: "2 cucharadas" },
      { name: "salsa de soja o sal", measure: "a gusto" },
    ],
    instructions:
      "Calentá el aceite en un wok o sartén amplia a fuego alto.\nRehogá la cebolla picada hasta que tome color dorado suave.\nAgregá el arroz frío y desgranalo salteando constantemente durante 3 minutos.\nHacé un hueco al centro, volcá el huevo batido, revolvé y mezclá todo.",
  },
  {
    id: "fallback-huevos",
    title: "Huevos revueltos con verdes",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Huevos", "Espinaca"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "huevos", measure: "2 unidades" },
      { name: "espinaca fresca", measure: "1 puñado picado" },
      { name: "manteca o aceite", measure: "1 cucharadita" },
      { name: "sal y pimienta", measure: "a gusto" },
    ],
    instructions:
      "Picá la espinaca fresca finamente.\nBatí ligeramente los huevos en un bol con sal y pimienta.\nCalentá la sartén con la manteca a fuego bajo y sumá la espinaca un minuto.\nVolcá los huevos y revolvé suavemente con espátula hasta que queden cremosos.",
  },
  {
    id: "fallback-sopa",
    title: "Sopa rápida de verduras",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Cebolla"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "cebolla", measure: "1 unidad" },
      { name: "verduras surtidas", measure: "300 gramos" },
      { name: "agua o caldo", measure: "750 ml" },
      { name: "aceite", measure: "1 cucharada" },
      { name: "sal y laurel", measure: "a gusto" },
    ],
    instructions:
      "Cortá las verduras que tengas en cubos medianos.\nDorá la cebolla en una cacerola con aceite durante 3 minutos.\nAgregá el resto de las verduras, el agua y una hojita de laurel.\nHerví tapado a fuego suave durante 18 minutos hasta que todo esté tierno.",
  },
  {
    id: "fallback-papas",
    title: "Papas al horno con hierbas",
    image: "https://www.themealdb.com/images/media/meals/1549542994.jpg",
    matchedIngredients: ["Papas"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "papas", measure: "3 unidades medianas" },
      { name: "aceite", measure: "3 cucharadas" },
      { name: "romero o pimentón", measure: "1 cucharadita" },
      { name: "sal gruesa", measure: "a gusto" },
    ],
    instructions:
      "Lavá bien las papas y cortalas en gajos o cubos parejos.\nColocalas en una asadera, rociá con aceite y condimentá con pimentón y sal.\nMezclá para que queden bien cubiertas.\nLlevalas a horno fuerte a 200°C durante 30 a 35 minutos hasta que queden crocantes.",
  },
  {
    id: "fallback-tostada",
    title: "Tostada de palta y tomate",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Pan", "Palta", "Tomates cherry"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "pan", measure: "2 rodajas tostadas" },
      { name: "palta", measure: "1/2 unidad pisada" },
      { name: "tomates cherry", measure: "4 unidades en rodajitas" },
      { name: "limón y sal", measure: "unas gotas a gusto" },
    ],
    instructions:
      "Tostá las rodajas de pan hasta que queden crujientes.\nPisá la palta con un tenedor agregando unas gotas de limón y sal.\nUntá generosamente sobre las tostadas.\nCompletá con los tomates cherry cortados y un toque de pimienta.",
  },
  {
    id: "fallback-yogur",
    title: "Yogur con fruta y avena",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Yogur", "Frutas"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "yogur natural", measure: "1 pote" },
      { name: "fruta de estación", measure: "1 taza picada" },
      { name: "avena arrollada", measure: "3 cucharadas" },
      { name: "miel", measure: "1 cucharadita opcional" },
    ],
    instructions:
      "Serví el yogur natural en un bol.\nAgregá la fruta fresca madura cortada en trozos chicos.\nEspolvoreá la avena por encima y endulzá con miel a gusto.",
  },
  {
    id: "fallback-legumbres",
    title: "Ensalada de lentejas",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Lentejas", "Tomates cherry"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "lentejas cocidas o en lata", measure: "1 taza escurrida" },
      { name: "tomates cherry", measure: "1/2 taza en mitades" },
      { name: "cebolla o verdeo", measure: "2 cucharadas picadas" },
      { name: "aceite y limón", measure: "para aliñar" },
    ],
    instructions:
      "Enjuagá y escurrí bien las lentejas cocidas.\nMezclalas en un bol con los tomates cherry y la cebolla picada.\nCondimentá con aceite, jugo de limón, sal y pimienta.\nDejá reposar 5 minutos antes de servir para integrar los sabores.",
  },
  {
    id: "fallback-pollo-horno",
    title: "Pollo al horno con papas",
    image: "https://www.themealdb.com/images/media/meals/1529444830.jpg",
    matchedIngredients: ["Pechuga de pollo", "Papas"],
    source: "FreshTrack",
    isLocalFallback: true,
    ingredients: [
      { name: "pechuga o presas de pollo", measure: "2 piezas" },
      { name: "papas", measure: "2 unidades cortadas" },
      { name: "aceite", measure: "2 cucharadas" },
      { name: "limón, sal y orégano", measure: "a gusto" },
    ],
    instructions:
      "Acomodá el pollo y las papas cortadas en una fuente para horno.\nRociá con el jugo de limón y aceite.\nCondimentá con sal, pimienta y orégano generosamente.\nHorneá a 190°C durante 40 minutos hasta que el pollo esté cocido y las papas doradas.",
  },
];

// Initialize gluten-free status on static fallback recipes
for (const recipe of fallbackRecipes) {
  recipe.isGlutenFreeEstimated = isGlutenFreeEstimated(recipe.ingredients);
}

/**
 * Filters fallback recipes with user's pantry products using token matching.
 * Excludes recipes where 0 ingredients match.
 */
export function filterFallbackRecipes(
  pantryProducts: Array<{ name: string; quantity?: string; category?: string }>
): RecipeSuggestion[] {
  if (!pantryProducts || pantryProducts.length === 0) {
    return [];
  }

  const results: RecipeSuggestion[] = [];

  for (const recipe of fallbackRecipes) {
    const ingredients = recipe.ingredients || [];
    const matchedNames: string[] = [];

    for (const ing of ingredients) {
      const matchedItem = findMatchingPantryItem(
        ing.name,
        pantryProducts as any[]
      );
      if (matchedItem && !matchedNames.includes(matchedItem.name)) {
        matchedNames.push(matchedItem.name);
      }
    }

    if (matchedNames.length > 0) {
      results.push({
        ...recipe,
        matchedIngredients: matchedNames,
        pantryMatchRatio: {
          matched: matchedNames.length,
          total: ingredients.length,
        },
      });
    }
  }

  // Sort by highest number of matching pantry ingredients first
  return results.sort(
    (a, b) =>
      (b.pantryMatchRatio?.matched || 0) - (a.pantryMatchRatio?.matched || 0)
  );
}

function toApiIngredient(name: string): string {
  const normalized = name.toLowerCase().trim();
  return ingredientAliases[normalized] || normalized.replace(/\s+/g, "_");
}

export type ProductLike = {
  name: string;
  days: number;
  status: "ok" | "soon" | "expired";
  category?: string;
  quantity?: string;
};

/**
 * Searches recipes prioritizing products about to expire.
 * - Filters out expired products (status === "expired" or days <= 0).
 * - Issues a warning if expired products exist.
 * - Queries TheMealDB with top 3 soonest-expiring products (up to 7 days).
 * - Avoids external calls if all products expire in > 7 days.
 * - Falls back to local recipes only on network error or timeout.
 */
export async function searchRecipesByExpiring(
  products: ProductLike[],
  signal?: AbortSignal
): Promise<RecipeSearchResult> {
  const expiredCount = products.filter(
    (p) => p.status === "expired" || p.days <= 0
  ).length;

  const warning =
    expiredCount > 0
      ? `Tenés ${expiredCount} ${
          expiredCount === 1 ? "producto vencido" : "productos vencidos"
        }: revisalos antes de cocinar. No los usamos en las recetas.`
      : null;

  // Filter valid unexpired products
  const validProducts = products.filter(
    (p) => p.status !== "expired" && p.days > 0
  );

  // Prioritize "soon", otherwise products within 7 days
  let priority = validProducts
    .filter((p) => p.status === "soon")
    .sort((a, b) => a.days - b.days);

  if (priority.length === 0) {
    priority = validProducts
      .filter((p) => p.days <= 7)
      .sort((a, b) => a.days - b.days);
  }

  // If nothing expires within 7 days, despensa tranquila (no API calls)
  if (priority.length === 0) {
    return {
      recipes: [],
      warning,
      info: "No hay nada por vencer, tu despensa está tranquila",
      isLocalFallback: false,
    };
  }

  // Take top 3 priority products
  const usable = priority.slice(0, 3);
  const cacheKey = usable
    .map((p) => p.name.trim().toLowerCase())
    .sort()
    .join("|");

  const cached = searchMemoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      recipes: cached.recipes,
      warning,
      isLocalFallback: false,
    };
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 6000);

  if (signal) {
    signal.addEventListener("abort", () => timeoutController.abort());
  }

  try {
    const responses = await Promise.all(
      usable.map(async (product) => {
        const queryIngredient = toApiIngredient(product.name);
        const response = await fetch(
          `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(
            queryIngredient
          )}`,
          { signal: timeoutController.signal }
        );

        if (!response.ok) {
          throw new Error(`TheMealDB HTTP error ${response.status}`);
        }

        const data = (await response.json()) as MealFilterResponse;
        return (data.meals || []).slice(0, 5).map((meal) => ({
          ...meal,
          matchedIngredient: product.name,
        }));
      })
    );

    clearTimeout(timeoutId);

    const deduped = new Map<string, RecipeSuggestion>();
    responses.flat().forEach((meal) => {
      const current = deduped.get(meal.idMeal);
      if (current) {
        current.matchedIngredients = Array.from(
          new Set([...current.matchedIngredients, meal.matchedIngredient])
        );
      } else {
        deduped.set(meal.idMeal, {
          id: meal.idMeal,
          title: meal.strMeal,
          image: meal.strMealThumb,
          matchedIngredients: [meal.matchedIngredient],
          source: "TheMealDB",
          url: `https://www.themealdb.com/meal.php?c=${meal.idMeal}`,
          sourceLanguage: "en",
        });
      }
    });

    const results = Array.from(deduped.values())
      .sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length)
      .slice(0, 12);

    if (results.length > 0) {
      searchMemoryCache.set(cacheKey, { timestamp: now, recipes: results });
      return { recipes: results, warning, isLocalFallback: false };
    }

    // If TheMealDB returned 0 recipes, provide pantry-matched fallback ideas
    const localFallbacks = filterFallbackRecipes(validProducts);
    return {
      recipes: localFallbacks,
      warning,
      error: "No encontramos recetas en la red para esos ingredientes. Podés usar las ideas locales.",
      isLocalFallback: true,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // If aborted by user unmount/navigation, don't report as network error
    if (signal?.aborted && !timeoutController.signal.aborted) {
      return { recipes: [], warning };
    }

    const localFallbacks = filterFallbackRecipes(validProducts);
    return {
      recipes: localFallbacks,
      warning,
      error: "No pudimos conectar con el recetario. Podés usar las ideas locales.",
      isLocalFallback: true,
    };
  }
}

/**
 * Translates recipe fields (title, instructions, ingredient names) via /api/translate.
 * Caches translated recipes in localStorage under 'freshtrack-recipe-i18n-v1'.
 * Falls back to original English text with isOriginalEnglish: true if translation fails.
 */
export async function translateRecipe(
  recipe: RecipeSuggestion
): Promise<RecipeSuggestion> {
  if (recipe.source === "FreshTrack") {
    return {
      ...recipe,
      isOriginalEnglish: false,
    };
  }

  const cacheKey = `${recipe.id}-${recipe.sourceLanguage || "en"}`;
  const storage = typeof window !== "undefined" && window.localStorage
    ? window.localStorage
    : typeof localStorage !== "undefined"
    ? localStorage
    : null;

  if (storage) {
    try {
      const stored = storage.getItem(RECIPE_I18N_STORAGE_KEY);
      if (stored) {
        const cache = JSON.parse(stored);
        if (cache[cacheKey]) {
          return {
            ...recipe,
            ...cache[cacheKey],
            isOriginalEnglish: false,
          };
        }
      }
    } catch {
      // ignore storage parse errors
    }
  }

  const ingredients = recipe.ingredients || [];
  const textsToTranslate: string[] = [
    recipe.title,
    recipe.instructions || "",
    ...ingredients.map((ing) => ing.name),
  ];

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: textsToTranslate,
        targetLang: "ES",
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        translated: boolean;
        texts: string[];
      };

      if (data.translated && Array.isArray(data.texts) && data.texts.length >= 2) {
        const translatedTitle = data.texts[0] || recipe.title;
        const translatedInstructions = data.texts[1] || recipe.instructions;
        const translatedIngredients = ingredients.map((ing, idx) => ({
          name: data.texts[2 + idx] || ing.name,
          measure: ing.measure,
        }));

        const translatedRecipe: RecipeSuggestion = {
          ...recipe,
          title: translatedTitle,
          instructions: translatedInstructions,
          ingredients: translatedIngredients,
          isOriginalEnglish: false,
        };

        if (storage) {
          try {
            const raw = storage.getItem(RECIPE_I18N_STORAGE_KEY);
            const cache = raw ? JSON.parse(raw) : {};
            cache[cacheKey] = {
              title: translatedTitle,
              instructions: translatedInstructions,
              ingredients: translatedIngredients,
            };
            storage.setItem(
              RECIPE_I18N_STORAGE_KEY,
              JSON.stringify(cache)
            );
          } catch {
            // ignore storage errors
          }
        }

        return translatedRecipe;
      }
    }
  } catch {
    // network or endpoint failure
  }

  return {
    ...recipe,
    isOriginalEnglish: true,
  };
}

/**
 * Retrieves full details for a recipe, translates if needed, and estimates gluten-free status.
 */
export async function getRecipeDetails(
  recipe: RecipeSuggestion,
  signal?: AbortSignal
): Promise<RecipeSuggestion> {
  if (recipe.source === "FreshTrack") {
    return {
      ...recipe,
      isGlutenFreeEstimated: isGlutenFreeEstimated(recipe.ingredients),
    };
  }

  const response = await fetch(
    `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipe.id}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error("No se pudo cargar el detalle");
  }

  const data = (await response.json()) as { meals?: MealDetail[] | null };
  const meal = data.meals?.[0];
  if (!meal) return recipe;

  const rawIngredients: RecipeIngredient[] = Array.from(
    { length: 20 },
    (_, index) => index + 1
  )
    .map((index) => ({
      name: meal[`strIngredient${index}`]?.trim() || "",
      measure: meal[`strMeasure${index}`]?.trim() || "",
    }))
    .filter((item) => item.name);

  const rawRecipe: RecipeSuggestion = {
    ...recipe,
    title: meal.strMeal,
    area: meal.strArea,
    category: meal.strCategory,
    ingredients: rawIngredients,
    instructions: meal.strInstructions,
    sourceLanguage: "en",
  };

  const translated = await translateRecipe(rawRecipe);
  return {
    ...translated,
    isGlutenFreeEstimated: isGlutenFreeEstimated(translated.ingredients),
  };
}

/**
 * Backward compatibility wrapper for searchRecipesByIngredients
 */
export async function searchRecipesByIngredients(
  ingredients: string[],
  signal?: AbortSignal
): Promise<RecipeSuggestion[]> {
  const dummyProducts: ProductLike[] = ingredients.map((name) => ({
    name,
    days: 1,
    status: "soon",
  }));
  const res = await searchRecipesByExpiring(dummyProducts, signal);
  return res.recipes;
}
