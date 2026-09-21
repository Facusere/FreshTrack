import { Product, StoredProduct } from "@/types/product";

const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "en",
  "con",
  "fresco",
  "fresca",
  "frescos",
  "frescas",
  "entero",
  "entera",
  "enteros",
  "enteras",
  "natural",
  "naturales",
  "cocido",
  "cocida",
  "cocidos",
  "cocidas",
  "picado",
  "picada",
  "picados",
  "picadas",
]);

/**
 * Normalizes text: lowercase, strip accents, remove punctuation and parentheses.
 */
export function normalizeText(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()[\]{}.,;:/\\!?"'`~*+=_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Simple singularizer for Spanish and English food nouns.
 */
export function singularizeWord(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;

  // Spanish / English specific irregulars
  if (w === "tomates" || w === "tomatoes") return "tomate";
  if (w === "papas" || w === "potatoes" || w === "patatas") return "papa";
  if (w === "limones" || w === "lemons") return "limon";
  if (w === "cebollas" || w === "onions") return "cebolla";
  if (w === "zanahorias" || w === "carrots") return "zanahoria";
  if (w === "huevos" || w === "eggs") return "huevo";
  if (w === "fideos" || w === "noodles") return "fideo";
  if (w === "manzanas" || w === "apples") return "manzana";
  if (w === "naranjas" || w === "oranges") return "naranja";
  if (w === "frutillas" || w === "strawberries") return "frutilla";
  if (w === "arvejas" || w === "peas") return "arveja";
  if (w === "lentejas" || w === "lentils") return "lenteja";
  if (w === "porotos" || w === "beans") return "poroto";

  // General Spanish plural rules
  if (w.endsWith("ces")) {
    return w.slice(0, -3) + "z"; // e.g. nueces -> nuez
  }
  if (w.endsWith("es") && w.length > 4) {
    const root = w.slice(0, -2);
    // If ending in consonant + es (limon-es)
    if (!/[aeiou]$/.test(root)) {
      return root;
    }
  }
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) {
    return w.slice(0, -1);
  }

  return w;
}

/**
 * Extracts normalized, filtered, and singularized tokens.
 */
export function tokenizeIngredient(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .map(singularizeWord);
}

// Canonical synonym groups indexed by principal noun (ES & EN)
const RAW_SYNONYMS: string[][] = [
  ["espinaca", "espinaca fresca", "spinach"],
  ["tomate", "tomates", "tomates cherry", "tomato", "tomatoes"],
  ["papa", "papas", "patata", "patatas", "potato", "potatoes"],
  ["cebolla", "cebollas", "onion", "onions"],
  ["pollo", "pechuga de pollo", "chicken", "chicken breast", "chicken_breast"],
  ["palta", "aguacate", "avocado"],
  ["leche", "leche entera", "leche descremada", "milk"],
  ["yogur", "yogurt", "yogur natural", "natural yogurt"],
  ["aceite", "aceite de oliva", "oil", "olive oil"],
  ["arroz", "arroz largo fino", "rice"],
  ["pasta", "fideos", "pasta seca", "spaghetti", "noodles"],
  ["huevo", "huevos", "egg", "eggs"],
  ["queso", "cheese"],
  ["pan", "pan de molde", "pan lactal", "bread"],
  ["harina", "flour"],
  ["zanahoria", "zanahorias", "carrot", "carrots"],
  ["ajo", "garlic"],
  ["manteca", "mantequilla", "butter"],
  ["carne", "carne picada", "carne vacuna", "beef", "ground beef"],
  ["pescado", "merluza", "salmón", "salmon", "fish", "tuna", "atun", "atún"],
  ["limon", "limón", "lemon", "lime"],
  ["champiñon", "champiñones", "hongos", "mushroom", "mushrooms"],
  ["morron", "morrón", "pimiento", "bell pepper", "pepper"],
  ["zapallito", "zucchini", "calabacin"],
  ["calabaza", "zapallo", "pumpkin", "squash"],
];

// Pre-tokenized lookup maps for synonym groups
type SynonymGroup = {
  canonical: string;
  entries: Set<string>;
};

const SYNONYM_GROUPS: SynonymGroup[] = RAW_SYNONYMS.map((group) => {
  const canonical = singularizeWord(normalizeText(group[0]));
  const entries = new Set<string>();
  group.forEach((item) => {
    const itemTokens = tokenizeIngredient(item);
    itemTokens.forEach((t) => entries.add(t));
  });
  return { canonical, entries };
});

/**
 * Returns canonical group if word is recognized in synonyms.
 */
function getSynonymCanonical(word: string): string | null {
  for (const group of SYNONYM_GROUPS) {
    if (group.entries.has(word)) {
      return group.canonical;
    }
  }
  return null;
}

export type MatchScoreResult = {
  score: number; // 0 = no match, 60 = synonym, 80 = tokens contained, 100 = exact
};

/**
 * Evaluates match score between a pantry item and a recipe ingredient.
 * Uses exact token matching, never substrings.
 */
export function matchIngredientTokens(
  itemText: string,
  recipeIngredientText: string
): MatchScoreResult {
  const itemTokens = tokenizeIngredient(itemText);
  const recipeTokens = tokenizeIngredient(recipeIngredientText);

  if (itemTokens.length === 0 || recipeTokens.length === 0) {
    return { score: 0 };
  }

  // 1. Exact token list match
  if (
    itemTokens.length === recipeTokens.length &&
    itemTokens.every((token, i) => token === recipeTokens[i])
  ) {
    return { score: 100 };
  }

  // 2. All tokens of the pantry item are contained in the recipe ingredient tokens
  const allItemTokensInRecipe = itemTokens.every((itemToken) =>
    recipeTokens.includes(itemToken)
  );
  if (allItemTokensInRecipe) {
    return { score: 80 };
  }

  // 2b. All tokens of the recipe ingredient are contained in the pantry item
  const allRecipeTokensInItem = recipeTokens.every((recipeToken) =>
    itemTokens.includes(recipeToken)
  );
  if (allRecipeTokensInItem) {
    return { score: 75 };
  }

  // 3. Synonym matching by principal noun
  for (const itemToken of itemTokens) {
    const itemCanon = getSynonymCanonical(itemToken);
    if (!itemCanon) continue;

    for (const recipeToken of recipeTokens) {
      const recipeCanon = getSynonymCanonical(recipeToken);
      if (itemCanon === recipeCanon) {
        return { score: 60 };
      }
    }
  }

  return { score: 0 };
}

/**
 * Selects the best pantry item matching a recipe ingredient according to:
 * 1) Non-expired filter (status !== "expired")
 * 2) Highest match score (> 0)
 * 3) FEFO (earliest expiryDate) to break ties
 */
export function findBestMatchingItem<T extends StoredProduct | Product>(
  pantryItems: T[],
  recipeIngredient: { name: string; nameOriginal?: string }
): T | null {
  // Exclude expired items unconditionally
  const nonExpired = pantryItems.filter((item) => {
    if ("status" in item && item.status === "expired") {
      return false;
    }
    return true;
  });

  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const item of nonExpired) {
    // Try matching with Spanish recipe name
    let matchRes = matchIngredientTokens(item.name, recipeIngredient.name);

    // If English original name is present, try matching with that as well
    if (recipeIngredient.nameOriginal) {
      const origRes = matchIngredientTokens(item.name, recipeIngredient.nameOriginal);
      if (origRes.score > matchRes.score) {
        matchRes = origRes;
      }
    }

    if (matchRes.score <= 0) {
      continue;
    }

    if (matchRes.score > bestScore) {
      bestScore = matchRes.score;
      bestMatch = item;
    } else if (matchRes.score === bestScore && bestMatch) {
      // Tie breaker: FEFO (First Expired, First Out)
      // Earlier expiryDate comes first
      if (item.expiryDate < bestMatch.expiryDate) {
        bestMatch = item;
      }
    }
  }

  return bestMatch;
}

export function findMatchingPantryItem<T extends StoredProduct | Product>(
  ingredientName: string,
  pantryItems: T[]
): T | null {
  return findBestMatchingItem(pantryItems, { name: ingredientName });
}
