import { daysUntil, formatExpiryDisplay, statusFromDays } from "@/lib/dates";
import { ProductCategory } from "@/lib/categories";
import { DateLabel } from "@/lib/dateRecognition";

export type ProductStatus = "ok" | "soon" | "expired";
export type ProductState = "cerrado" | "abierto";

export interface StoredProduct {
  id: number;
  name: string;
  category: ProductCategory | string;
  expiryDate: string; // ISO date string (YYYY-MM-DD)
  quantity: string;
  icon: string;
  location?: string;
  estimated?: boolean;
  dateLabel?: DateLabel;
  corrected?: boolean;
  state?: ProductState;
  openedAt?: string; // ISO date string (YYYY-MM-DD)
  [key: string]: unknown;
}

export type Product = StoredProduct & {
  days: number;
  status: ProductStatus;
  expiry: string; // Display text e.g. "18 sep" or "12 ago 27"
  state?: ProductState;
  openedAt?: string;
};

export function deriveProduct(stored: StoredProduct, today: Date = new Date()): Product {
  const days = daysUntil(stored.expiryDate, today);
  const status = statusFromDays(days);
  const expiry = formatExpiryDisplay(stored.expiryDate, today);
  return {
    ...stored,
    days,
    status,
    expiry,
    state: stored.state || "cerrado",
    openedAt: stored.openedAt,
  };
}
