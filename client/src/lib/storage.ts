import { addDaysISO } from "./dates";
import { StoredProduct } from "@/types/product";

export const PRODUCTS_STORAGE_KEY = "freshtrack-products-v3";
export const OLD_PRODUCTS_STORAGE_KEY = "freshtrack-products-v2";
export const CONSUMPTION_HISTORY_KEY = "freshtrack-consumption-history-v2";
export const OLD_CONSUMPTION_HISTORY_KEY = "freshtrack-consumption-history-v1";

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Error loading JSON from localStorage key "${key}":`, error);
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22)
    ) {
      console.error(`Storage quota exceeded while saving key "${key}".`);
    } else {
      console.error(`Error saving JSON to localStorage key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Validates whether an object conforms to the StoredProduct contract.
 */
export function isValidStoredProduct(item: any): item is StoredProduct {
  if (!item || typeof item !== "object") return false;
  if (typeof item.id !== "number" && typeof item.id !== "string") return false;
  if (typeof item.name !== "string" || !item.name.trim()) return false;
  if (typeof item.category !== "string") return false;
  if (typeof item.expiryDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)) {
    return false;
  }
  // Validate that the ISO date is an actual valid date
  const [y, m, d] = item.expiryDate.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (
    dateObj.getFullYear() !== y ||
    dateObj.getMonth() !== m - 1 ||
    dateObj.getDate() !== d
  ) {
    return false;
  }
  if (typeof item.quantity !== "string") return false;
  if (typeof item.icon !== "string") return false;

  return true;
}

/**
 * Loads products from freshtrack-products-v3.
 * If not found, attempts migration from freshtrack-products-v2.
 * Validates each item and discards invalid ones without throwing.
 */
export function loadStoredProducts(today: Date = new Date()): StoredProduct[] | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  // Discard incompatible consumption history v1 if present
  if (localStorage.getItem(OLD_CONSUMPTION_HISTORY_KEY) !== null) {
    localStorage.removeItem(OLD_CONSUMPTION_HISTORY_KEY);
  }

  const rawV3 = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (rawV3 !== null) {
    try {
      const parsed = JSON.parse(rawV3);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidStoredProduct);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  // Attempt migration from v2
  const rawV2 = localStorage.getItem(OLD_PRODUCTS_STORAGE_KEY);
  if (rawV2 !== null) {
    try {
      const parsedV2 = JSON.parse(rawV2);
      if (Array.isArray(parsedV2)) {
        const migrated: StoredProduct[] = [];
        for (const item of parsedV2) {
          if (!item || typeof item !== "object") continue;
          if (typeof item.name !== "string" || !item.name.trim()) continue;
          const days = typeof item.days === "number" ? item.days : 7;
          const expiryDate =
            typeof item.expiryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)
              ? item.expiryDate
              : addDaysISO(days, today);

          const storedItem: StoredProduct = {
            id: typeof item.id === "number" ? item.id : Date.now() + Math.floor(Math.random() * 1000),
            name: item.name.trim(),
            category: String(item.category || "Almacén seco"),
            expiryDate,
            quantity: String(item.quantity || "1 unidad"),
            icon: String(item.icon || "📦"),
            location: item.location ? String(item.location) : undefined,
            estimated: Boolean(item.estimated),
            dateLabel: item.dateLabel,
            corrected: Boolean(item.corrected),
          };

          if (isValidStoredProduct(storedItem)) {
            migrated.push(storedItem);
          }
        }

        saveJSON(PRODUCTS_STORAGE_KEY, migrated);
        localStorage.removeItem(OLD_PRODUCTS_STORAGE_KEY);
        return migrated;
      }
    } catch (e) {
      console.warn("Failed to migrate v2 products:", e);
    }
    localStorage.removeItem(OLD_PRODUCTS_STORAGE_KEY);
    return [];
  }

  return null;
}

export function saveStoredProducts(products: StoredProduct[]): boolean {
  const valid = products.filter(isValidStoredProduct);
  return saveJSON(PRODUCTS_STORAGE_KEY, valid);
}
