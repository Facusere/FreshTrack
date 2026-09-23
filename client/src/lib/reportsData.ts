import { ImpactStats } from "./impactStats";
import { Product } from "@/types/product";
import { ConsumptionRecord } from "./inventoryConsumption";
import { loadJSON, saveJSON } from "./storage";

export const EXPIRED_HISTORY_KEY = "freshtrack-expired-history-v1";
export const MONTHLY_IMPACT_HISTORY_KEY = "freshtrack-monthly-impact-history-v1";

export interface MonthlyImpactPoint {
  month: string; // e.g. "Jul", "Ago", "Sep"
  fullMonth: string; // "2026-09"
  kg: number;
  pesos: number;
  isProjection?: boolean;
}

export interface CategoryWastePoint {
  category: string;
  count: number;
  percentage: number;
}

export interface TopExpiredProduct {
  rank: number;
  name: string;
  category: string;
  count: number;
  icon?: string;
}

export interface HistoricalExpiredItem {
  id: number | string;
  name: string;
  category: string;
  expiredAt: string; // ISO date
}

export function loadExpiredHistory(): HistoricalExpiredItem[] {
  return loadJSON<HistoricalExpiredItem[]>(EXPIRED_HISTORY_KEY, []);
}

export function recordExpiredItem(name: string, category: string): void {
  const history = loadExpiredHistory();
  const next: HistoricalExpiredItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category,
    expiredAt: new Date().toISOString(),
  };
  saveJSON(EXPIRED_HISTORY_KEY, [...history, next]);
}

/**
 * Builds the monthly avoided waste data (kg and pesos).
 * Uses real history if stored; otherwise calculates a realistic projection based on current month.
 */
export function buildMonthlyWasteData(
  impact: ImpactStats,
  today: Date = new Date()
): MonthlyImpactPoint[] {
  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  const storedHistory = loadJSON<Record<string, { kg: number; money: number }>>(
    MONTHLY_IMPACT_HISTORY_KEY,
    {}
  );

  const currentMonthIdx = today.getMonth();
  const currentYear = today.getFullYear();

  // Generate 4 consecutive months leading up to current month
  const result: MonthlyImpactPoint[] = [];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentYear, currentMonthIdx - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = monthNames[d.getMonth()];

    if (i === 0) {
      // Current month uses actual impact stats
      result.push({
        month: `${label} (Actual)`,
        fullMonth: key,
        kg: impact.kgSaved,
        pesos: impact.moneySaved,
        isProjection: false,
      });
    } else if (storedHistory[key]) {
      // Real historical record
      result.push({
        month: label,
        fullMonth: key,
        kg: storedHistory[key].kg,
        pesos: storedHistory[key].money,
        isProjection: false,
      });
    } else {
      // Projection based on current month activity if any
      const factor = i === 1 ? 0.8 : i === 2 ? 0.6 : 0.4;
      const projKg = impact.kgSaved > 0 ? Number((impact.kgSaved * factor).toFixed(1)) : 0;
      const projPesos = impact.moneySaved > 0 ? Math.round(impact.moneySaved * factor) : 0;
      result.push({
        month: `${label}*`,
        fullMonth: key,
        kg: projKg,
        pesos: projPesos,
        isProjection: true,
      });
    }
  }

  return result;
}

/**
 * Calculates categories with highest number of expired products.
 */
export function buildCategoryWasteData(
  products: Product[],
  history: HistoricalExpiredItem[] = loadExpiredHistory()
): CategoryWastePoint[] {
  const categoryCounts: Record<string, number> = {};

  // Count active expired products
  for (const product of products) {
    if (product.status === "expired" || product.days <= 0) {
      const cat = product.category || "Otros";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  // Add historical expired records
  for (const item of history) {
    const cat = item.category || "Otros";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const entries = Object.entries(categoryCounts);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) return [];

  return entries
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Builds the top 5 most frequently expired products.
 */
export function buildTopExpiredProducts(
  products: Product[],
  history: HistoricalExpiredItem[] = loadExpiredHistory()
): TopExpiredProduct[] {
  const productCounts: Record<string, { count: number; category: string; icon?: string }> = {};

  // Active expired items
  for (const product of products) {
    if (product.status === "expired" || product.days <= 0) {
      const key = product.name.trim().toLowerCase();
      if (!productCounts[key]) {
        productCounts[key] = {
          count: 0,
          category: product.category,
          icon: product.icon,
        };
      }
      productCounts[key].count += 1;
    }
  }

  // Historical expired items
  for (const item of history) {
    const key = item.name.trim().toLowerCase();
    if (!productCounts[key]) {
      productCounts[key] = { count: 0, category: item.category };
    }
    productCounts[key].count += 1;
  }

  const sorted = Object.entries(productCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return sorted.map(([name, data], index) => {
    // Capitalize first letter
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      rank: index + 1,
      name: displayName,
      category: data.category,
      count: data.count,
      icon: data.icon,
    };
  });
}

/**
 * Checks whether sufficient data exists to display charts.
 */
export function hasSufficientReportsData(
  impact: ImpactStats,
  products: Product[],
  consumptionHistory: ConsumptionRecord[] = []
): boolean {
  const hasImpact = impact.actions > 0 || impact.kgSaved > 0 || impact.moneySaved > 0;
  const hasExpired = products.some((p) => p.status === "expired" || p.days <= 0);
  const hasHistory = consumptionHistory.length > 0 || loadExpiredHistory().length > 0;
  return hasImpact || hasExpired || hasHistory;
}
