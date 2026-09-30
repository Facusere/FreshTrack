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
    <div className="tomorro-card-bone group relative overflow-hidden p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[#b7bda5]">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${tone}`}
        >
          {icon}
        </span>
        {badge && (
          <span className="whitespace-nowrap rounded-full border border-[#b7bda5]/60 bg-white/80 dark:bg-[#122314] px-2.5 py-0.5 text-[11px] font-semibold text-[#5c6351] dark:text-[#b7bda5]">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#5c6351] dark:text-[#b7bda5]">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-[#122314] dark:text-[#ffffff] sm:text-3xl">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[#5c6351] dark:text-[#b7bda5]">{note}</p>
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
        icon={<PackageOpen size={19} />}
        tone="bg-[#e7f9dd] text-[#1c3e21] dark:bg-[#1c3520] dark:text-[#68ef3f]"
        badge="Stock"
      />
      <StatCard
        label="Por vencer"
        value={String(soonCount)}
        note={`en los próximos ${soonThresholdDays} días`}
        icon={<Clock3 size={19} />}
        tone="bg-[#fdf5e6] text-[#7a4d0c] dark:bg-[#2b2314] dark:text-[#f5cf7d]"
        badge="Prioridad"
      />
      <StatCard
        label="Ya vencidos"
        value={String(expiredCount)}
        note="requieren atención"
        icon={<Zap size={19} />}
        tone="bg-[#fdf1ef] text-[#8e2b20] dark:bg-[#2e1816] dark:text-[#f59c90]"
        badge="Alerta"
      />
      <StatCard
        label="Desperdicio evitado"
        value={formatMoney(moneySaved)}
        note={`${kgSaved} kg este mes`}
        icon={<ArrowDownRight size={19} />}
        tone="bg-[#68ef3f]/20 text-[#273f2b] dark:bg-[#68ef3f]/20 dark:text-[#68ef3f]"
        badge="Impacto"
      />
    </section>
  );
}

export default StatsSection;
