// Smart Shopping List and Restocking System for FreshTrack
import { estimateShelfLife } from "./shelfLifeCatalog";
import { addDaysISO } from "./dates";
import { isQuantityLow, parseQuantity, formatQuantity } from "./quantity";
import { normalizeText, matchIngredientTokens } from "./ingredientMatching";
import { ALL_CATEGORIES } from "./categories";
import { Product, StoredProduct } from "@/types/product";
import { loadJSON, saveJSON } from "./storage";

export type ShoppingItemReason = "frecuente" | "stock_bajo" | "manual" | "vencido" | "receta";

export type ShoppingItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  reason?: ShoppingItemReason;
  reasons?: ShoppingItemReason[];
  recipeNames?: string[];
  completed: boolean;
  createdAt: string;
  notes?: string;
};

export type ConsumptionHistoryEntry = {
  id: number;
  title: string;
  ingredients: string[];
  createdAt: string;
};

export type PantryItemReference = Product;

export const SHOPPING_LIST_STORAGE_KEY = "freshtrack-shopping-list-v1";

export function loadShoppingList(): ShoppingItem[] {
  return loadJSON<ShoppingItem[]>(SHOPPING_LIST_STORAGE_KEY, []);
}

export function saveShoppingList(items: ShoppingItem[]): void {
  saveJSON(SHOPPING_LIST_STORAGE_KEY, items);
}

/**
 * Normaliza y compara si dos nombres corresponden al mismo producto
 * utilizando coincidencia por tokens y sinónimos de ingredientMatching.
 */
export function areItemsSameProduct(name1: string, name2: string): boolean {
  const n1 = normalizeText(name1);
  const n2 = normalizeText(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  const match = matchIngredientTokens(name1, name2);
  return match.score >= 75;
}

/**
 * Agrega o combina un ítem a la lista de compras sin duplicar.
 * Si ya existe, combina sus motivos (reasons) y recetas asociadas,
 * y ajusta la cantidad con parseQuantity.
 */
export function addOrMergeShoppingItem(
  currentList: ShoppingItem[],
  newItem: {
    name: string;
    category?: string;
    quantity?: string;
    reason?: ShoppingItemReason;
    reasons?: ShoppingItemReason[];
    recipeName?: string;
    notes?: string;
  }
): ShoppingItem[] {
  const cleanName = newItem.name.trim();
  if (!cleanName) return currentList;

  const existingIndex = currentList.findIndex((item) =>
    areItemsSameProduct(item.name, cleanName)
  );

  const incomingReasons: ShoppingItemReason[] = [
    ...(newItem.reasons || []),
    ...(newItem.reason ? [newItem.reason] : []),
  ];
  if (incomingReasons.length === 0) {
    incomingReasons.push("manual");
  }

  if (existingIndex >= 0) {
    const existing = currentList[existingIndex];
    const existingReasons = existing.reasons || (existing.reason ? [existing.reason] : ["manual"]);
    const mergedReasons = Array.from(new Set([...existingReasons, ...incomingReasons]));

    const existingRecipeNames = existing.recipeNames || [];
    const mergedRecipeNames = Array.from(
      new Set([...existingRecipeNames, ...(newItem.recipeName ? [newItem.recipeName] : [])])
    );

    // Merge de cantidades con parseQuantity
    let mergedQuantity = existing.quantity;
    if (newItem.quantity && newItem.quantity !== existing.quantity) {
      const qExisting = parseQuantity(existing.quantity);
      const qNew = parseQuantity(newItem.quantity);
      if (qExisting && qNew && qExisting.family === qNew.family) {
        mergedQuantity = formatQuantity({
          ...qExisting,
          amount: Math.max(qExisting.amount, qNew.amount),
        });
      } else if (!qExisting && qNew) {
        mergedQuantity = formatQuantity(qNew);
      }
    }

    const updated: ShoppingItem = {
      ...existing,
      reasons: mergedReasons,
      recipeNames: mergedRecipeNames.length > 0 ? mergedRecipeNames : undefined,
      quantity: mergedQuantity,
      notes: newItem.notes || existing.notes,
      // Si entra por stock bajo o receta, desmarca comprado para que el usuario no lo pase por alto
      completed: incomingReasons.some((r) => r === "receta" || r === "stock_bajo")
        ? false
        : existing.completed,
    };

    const copy = [...currentList];
    copy[existingIndex] = updated;
    return copy;
  }

  const category =
    newItem.category ||
    estimateShelfLife(cleanName, "cerrado")?.category ||
    "Almacén seco";

  let finalQuantity = newItem.quantity || "1 unidad";
  const parsedQ = parseQuantity(finalQuantity);
  if (parsedQ) {
    finalQuantity = formatQuantity(parsedQ);
  }

  const created: ShoppingItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: capitalize(cleanName),
    category,
    quantity: finalQuantity,
    reason: incomingReasons[0],
    reasons: incomingReasons,
    recipeNames: newItem.recipeName ? [newItem.recipeName] : undefined,
    completed: false,
    createdAt: new Date().toISOString(),
    notes: newItem.notes,
  };

  return [created, ...currentList];
}

/**
 * Alimenta la lista de compras con los productos de la despensa con stock bajo
 * sin duplicar ítems existentes.
 */
export function addLowStockToShoppingList(
  currentList: ShoppingItem[],
  pantry: Product[]
): ShoppingItem[] {
  let result = [...currentList];
  const lowItems = pantry.filter(
    (p) => p.status !== "expired" && isQuantityLow(p.quantity)
  );

  for (const p of lowItems) {
    result = addOrMergeShoppingItem(result, {
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      reason: "stock_bajo",
      notes: "Queda poco en despensa",
    });
  }

  return result;
}

/**
 * Alimenta la lista de compras con los ingredientes faltantes de una receta
 * sin duplicar ítems existentes.
 */
export function addRecipeMissingToShoppingList(
  currentList: ShoppingItem[],
  recipeTitle: string,
  missing: Array<{ name: string; quantity?: string }>
): ShoppingItem[] {
  let result = [...currentList];

  for (const m of missing) {
    result = addOrMergeShoppingItem(result, {
      name: m.name,
      quantity: m.quantity || "1 unidad",
      reason: "receta",
      recipeName: recipeTitle,
      notes: `Para preparar ${recipeTitle}`,
    });
  }

  return result;
}

/**
 * Devuelve las etiquetas de motivo que deben mostrarse en la UI para un ítem:
 * - "Queda poco" si está por stock bajo
 * - "Lo necesitás para [receta]" por cada receta asociada
 * - Vacío [] si solo se agregó de forma manual
 */
export function getItemReasonBadges(item: ShoppingItem): string[] {
  const badges: string[] = [];
  const allReasons = new Set<ShoppingItemReason>();
  if (item.reason) allReasons.add(item.reason);
  if (item.reasons) item.reasons.forEach((r) => allReasons.add(r));

  if (allReasons.has("stock_bajo")) {
    badges.push("Queda poco");
  }

  if (item.recipeNames && item.recipeNames.length > 0) {
    item.recipeNames.forEach((name) => {
      badges.push(`Lo necesitás para ${name}`);
    });
  } else if (allReasons.has("receta")) {
    badges.push("Lo necesitás para una receta");
  }

  return badges;
}

export type CategoryShoppingGroup = {
  category: string;
  items: ShoppingItem[];
};

/**
 * Agrupa los ítems de compras por categoría respetando el orden de pasillos
 * de supermercado definido en ALL_CATEGORIES.
 */
export function groupShoppingItemsByCategory(
  items: ShoppingItem[]
): CategoryShoppingGroup[] {
  const map = new Map<string, ShoppingItem[]>();

  for (const item of items) {
    const cat = item.category || "Almacén seco";
    const list = map.get(cat) || [];
    list.push(item);
    map.set(cat, list);
  }

  const groups: CategoryShoppingGroup[] = [];

  for (const cat of ALL_CATEGORIES) {
    if (map.has(cat)) {
      groups.push({
        category: cat,
        items: map.get(cat)!,
      });
      map.delete(cat);
    }
  }

  map.forEach((catItems, cat) => {
    groups.push({
      category: cat,
      items: catItems,
    });
  });

  return groups;
}

/**
 * Actualiza la cantidad de un ítem validando con parseQuantity y formateando con formatQuantity.
 * Retorna null si la cantidad no es válida.
 */
export function updateShoppingItemQuantity(
  currentList: ShoppingItem[],
  id: string,
  rawQuantity: string
): { updatedList: ShoppingItem[]; formatted: string } | null {
  const parsed = parseQuantity(rawQuantity);
  if (!parsed) return null;

  const formatted = formatQuantity(parsed);
  const updatedList = currentList.map((item) =>
    item.id === id ? { ...item, quantity: formatted } : item
  );

  return { updatedList, formatted };
}

/**
 * Incrementa o decrementa la cantidad de un ítem en pasos unitarios.
 */
export function adjustShoppingItemQuantityStep(
  currentList: ShoppingItem[],
  id: string,
  delta: number
): ShoppingItem[] {
  return currentList.map((item) => {
    if (item.id !== id) return item;
    const parsed = parseQuantity(item.quantity) || {
      amount: 1,
      unit: "unidad",
      family: "count" as const,
    };
    const step = parsed.family === "mass" && parsed.unit === "g" ? 100 : 1;
    const nextAmount = Math.max(1, Math.round((parsed.amount + delta * step) * 100) / 100);
    return {
      ...item,
      quantity: formatQuantity({ ...parsed, amount: nextAmount }),
    };
  });
}

/**
 * Calculates frequency of consumed ingredients from consumption history.
 */
export function calculateIngredientFrequencies(
  history: ConsumptionHistoryEntry[]
): Map<string, { count: number; rawName: string }> {
  const counts = new Map<string, { count: number; rawName: string }>();

  for (const record of history) {
    for (const ingredient of record.ingredients || []) {
      const trimmed = ingredient.trim();
      if (!trimmed) continue;
      const key = normalizeText(trimmed);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { count: 1, rawName: trimmed });
      }
    }
  }

  return counts;
}

/**
 * Generates intelligent restock suggestions by analyzing:
 * 1. Frequently consumed ingredients (history).
 * 2. Depleted or low-stock items in pantry (<= 1 unit or "queda poco").
 * 3. Expired items that need replacement.
 */
export function generateSmartSuggestions(
  pantry: Product[],
  history: ConsumptionHistoryEntry[],
  currentList: ShoppingItem[]
): ShoppingItem[] {
  const suggestions: ShoppingItem[] = [];

  // 1. Frequently consumed items from history that are not in current pantry or shopping list
  const frequencies = calculateIngredientFrequencies(history);
  const sortedFrequent = Array.from(frequencies.entries())
    .sort((a, b) => b[1].count - a[1].count);

  for (const [, { count, rawName }] of sortedFrequent) {
    if (currentList.some((item) => areItemsSameProduct(item.name, rawName))) {
      continue;
    }

    const inPantry = pantry.find((p) => areItemsSameProduct(p.name, rawName));
    const isLowInPantry = inPantry && (
      inPantry.status === "expired" ||
      isQuantityLow(inPantry.quantity)
    );

    if (!inPantry || isLowInPantry) {
      const estimated = estimateShelfLife(rawName, "cerrado");
      suggestions.push({
        id: `sug-freq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: capitalize(rawName),
        category: estimated?.category || (inPantry?.category) || "Almacén seco",
        quantity: inPantry?.quantity || "1 unidad",
        reason: "frecuente",
        reasons: ["frecuente"],
        completed: false,
        createdAt: new Date().toISOString(),
        notes: `Consumido ${count} ${count === 1 ? "vez" : "veces"} recientemente`,
      });
    }
  }

  // 2. Low-stock or expired pantry items
  for (const item of pantry) {
    if (currentList.some((existing) => areItemsSameProduct(existing.name, item.name))) {
      continue;
    }

    if (item.status === "expired") {
      suggestions.push({
        id: `sug-exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reason: "vencido",
        reasons: ["vencido"],
        completed: false,
        createdAt: new Date().toISOString(),
        notes: "Vencido en despensa — reponer fresco",
      });
    } else if (isQuantityLow(item.quantity)) {
      suggestions.push({
        id: `sug-low-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reason: "stock_bajo",
        reasons: ["stock_bajo"],
        completed: false,
        createdAt: new Date().toISOString(),
        notes: "Queda 1 o menos en despensa",
      });
    }
  }

  return suggestions;
}

export { isQuantityLow } from "./quantity";

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Converts purchased/checked items from the shopping list into stored pantry products,
 * automatically estimating shelf life and setting ISO expiryDate.
 */
export function migratePurchasedItemsToPantry(
  currentShoppingList: ShoppingItem[],
  detectIconFn: (name: string, category: string) => string,
  today: Date = new Date()
): {
  createdProducts: StoredProduct[];
  remainingShoppingList: ShoppingItem[];
} {
  const completed = currentShoppingList.filter((item) => item.completed);
  const remainingShoppingList = currentShoppingList.filter((item) => !item.completed);

  const createdProducts: StoredProduct[] = completed.map((item) => {
    const estimate = estimateShelfLife(item.name, "cerrado", item.category);
    const shelfDays = estimate?.days || 7;
    const expiryDate = addDaysISO(shelfDays, today);
    const icon = detectIconFn(item.name, item.category);

    return {
      id: Date.now() + Math.floor(Math.random() * 10000),
      name: item.name,
      category: item.category,
      expiryDate,
      quantity: item.quantity || "1 unidad",
      icon,
      estimated: true,
      dateLabel: "vencimiento" as const,
      state: "cerrado" as const,
    };
  });

  return {
    createdProducts,
    remainingShoppingList,
  };
}
