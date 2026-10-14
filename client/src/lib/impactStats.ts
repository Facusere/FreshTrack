import { loadJSON, saveJSON } from "./storage";

export type ImpactStats = {
  month: string;
  mealsSaved: number;
  kgSaved: number;
  moneySaved: number;
  actions: number;
};

export const IMPACT_STATS_STORAGE_KEY = "freshtrack-impact-stats-v1";
const STORAGE_KEY = IMPACT_STATS_STORAGE_KEY;
const currentMonth = () => new Date().toISOString().slice(0, 7);

export const ESTIMATED_KG_PER_RECIPE = 0.4;
export const ESTIMATED_MONEY_PER_RECIPE = 1200;
export const ESTIMATED_MEALS_PER_RECIPE = 1;

const initialStats: ImpactStats = { month: currentMonth(), mealsSaved: 0, kgSaved: 0, moneySaved: 0, actions: 0 };

export function loadImpactStats(): ImpactStats {
  const saved = loadJSON<ImpactStats | null>(STORAGE_KEY, null);
  if (saved?.month === currentMonth()) return saved;
  return { ...initialStats, month: currentMonth() };
}

export function saveImpactStats(stats: ImpactStats): boolean {
  return saveJSON(STORAGE_KEY, stats);
}

export function recordImpact(input: { kg?: number; money?: number; meals?: number } = {}) {
  const stats = loadImpactStats();
  const kgDelta = input.kg ?? ESTIMATED_KG_PER_RECIPE;
  const moneyDelta = input.money ?? ESTIMATED_MONEY_PER_RECIPE;
  const mealsDelta = input.meals ?? ESTIMATED_MEALS_PER_RECIPE;
  const next = {
    ...stats,
    kgSaved: Number((stats.kgSaved + kgDelta).toFixed(1)),
    moneySaved: stats.moneySaved + moneyDelta,
    mealsSaved: stats.mealsSaved + mealsDelta,
    actions: stats.actions + 1,
  };
  saveImpactStats(next);
  return next;
}

export function reverseImpact(input: { kg: number; money: number; meals: number }) {
  const stats = loadImpactStats();
  const next = { ...stats, kgSaved: Math.max(0, Number((stats.kgSaved - input.kg).toFixed(1))), moneySaved: Math.max(0, stats.moneySaved - input.money), mealsSaved: Math.max(0, stats.mealsSaved - input.meals), actions: Math.max(0, stats.actions - 1) };
  saveImpactStats(next);
  return next;
}

export function formatMoney(value: number) { return `$${value.toLocaleString("es-AR")}`; }
