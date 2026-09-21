// Smart Shopping List and Restocking System for FreshTrack
import { estimateShelfLife } from "./shelfLifeCatalog";
import { addDaysISO } from "./dates";
import { isQuantityLow } from "./quantity";
import { Product, StoredProduct } from "@/types/product";

export type ShoppingItemReason = "frecuente" | "stock_bajo" | "manual" | "vencido";

export type ShoppingItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  reason: ShoppingItemReason;
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

const SHOPPING_LIST_STORAGE_KEY = "freshtrack-shopping-list-v1";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function loadShoppingList(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHOPPING_LIST_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShoppingItem[];
  } catch {
    return [];
  }
}

export function saveShoppingList(items: ShoppingItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHOPPING_LIST_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save shopping list:", e);
  }
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
      const key = normalize(trimmed);
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
  const existingListNames = new Set(currentList.map((item) => normalize(item.name)));
  const suggestions: ShoppingItem[] = [];

  // 1. Frequently consumed items from history that are not in current pantry or shopping list
  const frequencies = calculateIngredientFrequencies(history);
  const sortedFrequent = Array.from(frequencies.entries())
    .sort((a, b) => b[1].count - a[1].count);

  for (const [key, { count, rawName }] of sortedFrequent) {
    if (existingListNames.has(key)) continue;

    const inPantry = pantry.find((p) => normalize(p.name) === key);
    const isLowInPantry = inPantry && (
      inPantry.status === "expired" ||
      isQuantityLow(inPantry.quantity)
    );

    if (!inPantry || isLowInPantry) {
      const estimated = estimateShelfLife(rawName, "cerrado");
      suggestions.push({
        id: `sug-freq-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: capitalize(rawName),
        category: estimated?.category || (inPantry?.category) || "Almacén seco",
        quantity: inPantry?.quantity || "1 unidad",
        reason: "frecuente",
        completed: false,
        createdAt: new Date().toISOString(),
        notes: `Consumido ${count} ${count === 1 ? "vez" : "veces"} recientemente`,
      });
      existingListNames.add(key);
    }
  }

  // 2. Low-stock or expired pantry items
  for (const item of pantry) {
    const key = normalize(item.name);
    if (existingListNames.has(key)) continue;

    if (item.status === "expired") {
      suggestions.push({
        id: `sug-exp-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reason: "vencido",
        completed: false,
        createdAt: new Date().toISOString(),
        notes: "Vencido en despensa — reponer fresco",
      });
      existingListNames.add(key);
    } else if (isQuantityLow(item.quantity)) {
      suggestions.push({
        id: `sug-low-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reason: "stock_bajo",
        completed: false,
        createdAt: new Date().toISOString(),
        notes: "Queda 1 o menos en despensa",
      });
      existingListNames.add(key);
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
    };
  });

  return {
    createdProducts,
    remainingShoppingList,
  };
}
