import { ArrowDownRight, Clock3, PackageOpen, Zap } from "lucide-react";
import { formatMoney } from "@/lib/impactStats";

export interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: string;
  badge?: string;
}

export function StatCard({ label, value, note, icon, tone, badge }: StatCardProps) {
  return (
    <div className="tomorro-card-bone group relative overflow-hidden p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105 border ${tone}`}
        >
          {icon}
        </span>
        {badge && (
          <span className="whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-content-muted">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-content-heading sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-content-muted">{note}</p>
    </div>
  );
}

export interface StatsSectionProps {
  totalProducts: number;
  soonCount: number;
  expiredCount: number;
  moneySaved: number;
  kgSaved: number;
  soonThresholdDays: number;
}

export function StatsSection({
  totalProducts,
  soonCount,
  expiredCount,
  moneySaved,
  kgSaved,
  soonThresholdDays,
}: StatsSectionProps) {
  return (
    <section className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
      <StatCard
        label="En tu despensa"
        value={String(totalProducts)}
        note="alimentos inventariados"
        icon={<PackageOpen size={20} />}
        tone="bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40"
        badge="Stock"
      />
      <StatCard
        label="Por vencer"
        value={String(soonCount)}
        note={`en los próximos ${soonThresholdDays} días`}
        icon={<Clock3 size={20} />}
        tone="bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40"
        badge="Prioridad"
      />
      <StatCard
        label="Ya vencidos"
        value={String(expiredCount)}
        note="requieren atención"
        icon={<Zap size={20} />}
        tone="bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/40"
        badge="Alerta"
      />
      <StatCard
        label="Desperdicio evitado"
        value={formatMoney(moneySaved)}
        note={`${kgSaved} kg este mes`}
        icon={<ArrowDownRight size={20} />}
        tone="bg-teal-50 text-teal-800 border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/40"
        badge="Impacto"
      />
    </section>
  );
}

export default StatsSection;
