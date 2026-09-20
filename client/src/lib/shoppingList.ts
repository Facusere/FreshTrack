// Smart Shopping List and Restocking System for FreshTrack
import { estimateShelfLife, ShelfLifeState } from "./shelfLifeCatalog";

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

export type PantryItemReference = {
  id: number;
  name: string;
  category: string;
  quantity: string;
  days: number;
  status: "ok" | "soon" | "expired";
  icon?: string;
};

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
  pantry: PantryItemReference[],
  history: ConsumptionHistoryEntry[],
  currentList: ShoppingItem[]
): ShoppingItem[] {
  const existingListNames = new Set(currentList.map((item) => normalize(item.name)));
  const pantryNames = new Set(pantry.map((item) => normalize(item.name)));
  const suggestions: ShoppingItem[] = [];

  // 1. Frequently consumed items from history that are not in current pantry or shopping list
  const frequencies = calculateIngredientFrequencies(history);
  const sortedFrequent = Array.from(frequencies.entries())
    .sort((a, b) => b[1].count - a[1].count);

  for (const [key, { count, rawName }] of sortedFrequent) {
    // If it was consumed at least once and is NOT currently well-stocked in the pantry or on the shopping list
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

export function isQuantityLow(qty: string): boolean {
  if (!qty) return true;
  const match = qty.match(/^(\d+(?:[.,]\d+)?|[½⅓⅔¼¾])/);
  if (match) {
    const num = Number(match[1].replace(",", "."));
    if (!isNaN(num) && num <= 1) return true;
  }
  return /1\b|una?\b|un\b|queda poco|últim/i.test(qty);
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Helper to calculate formatted expiry string (e.g. "27 sep" or "12 ago 27")
 */
export function formatExpiryDate(daysFromNow: number): string {
  const target = new Date();
  target.setDate(target.getDate() + Math.max(1, daysFromNow));
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const day = target.getDate();
  const month = monthNames[target.getMonth()];
  const currentYear = new Date().getFullYear();
  const targetYear = target.getFullYear();

  if (targetYear > currentYear) {
    const shortYear = String(targetYear).slice(2);
    return `${day} ${month} ${shortYear}`;
  }
  return `${day} ${month}`;
}

/**
 * Converts purchased/checked items from the shopping list into pantry products,
 * automatically estimating shelf life and dates.
 */
export function migratePurchasedItemsToPantry(
  currentShoppingList: ShoppingItem[],
  detectIconFn: (name: string, category: string) => string
): {
  createdProducts: Array<{
    id: number;
    name: string;
    category: string;
    expiry: string;
    days: number;
    quantity: string;
    status: "ok" | "soon" | "expired";
    icon: string;
    estimated: boolean;
    dateLabel: "vencimiento";
  }>;
  remainingShoppingList: ShoppingItem[];
} {
  const completed = currentShoppingList.filter((item) => item.completed);
  const remainingShoppingList = currentShoppingList.filter((item) => !item.completed);

  const createdProducts = completed.map((item) => {
    const estimate = estimateShelfLife(item.name, "cerrado", item.category);
    const shelfDays = estimate?.days || 7;
    const expiry = formatExpiryDate(shelfDays);
    const status: "ok" | "soon" | "expired" = shelfDays < 0 ? "expired" : shelfDays <= 3 ? "soon" : "ok";
    const icon = detectIconFn(item.name, item.category);

    return {
      id: Date.now() + Math.floor(Math.random() * 10000),
      name: item.name,
      category: item.category,
      expiry,
      days: shelfDays,
      quantity: item.quantity || "1 unidad",
      status,
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
