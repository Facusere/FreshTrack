export type ImpactStats = {
  month: string;
  mealsSaved: number;
  kgSaved: number;
  moneySaved: number;
  actions: number;
};

const STORAGE_KEY = "freshtrack-impact-stats-v1";
const currentMonth = () => new Date().toISOString().slice(0, 7);

const initialStats: ImpactStats = { month: currentMonth(), mealsSaved: 12, kgSaved: 4.8, moneySaved: 18400, actions: 9 };

export function loadImpactStats(): ImpactStats {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as ImpactStats | null;
    if (saved?.month === currentMonth()) return saved;
  } catch { /* use defaults */ }
  return { ...initialStats, month: currentMonth() };
}

export function saveImpactStats(stats: ImpactStats) { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); }

export function recordImpact(input: { kg?: number; money?: number; meals?: number }) {
  const stats = loadImpactStats();
  const next = { ...stats, kgSaved: Number((stats.kgSaved + (input.kg || 0.4)).toFixed(1)), moneySaved: stats.moneySaved + (input.money || 1200), mealsSaved: stats.mealsSaved + (input.meals || 1), actions: stats.actions + 1 };
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
