import React from "react";
import { ArrowDownRight, Clock3, PackageOpen, Zap } from "lucide-react";
import { formatMoney } from "@/lib/impactStats";

export interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: string;
}

export function StatCard({ label, value, note, icon, tone }: StatCardProps) {
  return (
    <div className="rounded-[20px] border border-line bg-surface p-4 shadow-[0_8px_24px_rgba(55,63,48,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(55,63,48,0.08)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-content-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-content-heading">{value}</p>
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
    <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="En tu despensa"
        value={String(totalProducts)}
        note="productos registrados"
        icon={<PackageOpen size={17} />}
        tone="bg-status-ok-bg text-status-ok-text"
      />
      <StatCard
        label="Por vencer"
        value={String(soonCount)}
        note={`en los próximos ${soonThresholdDays} días`}
        icon={<Clock3 size={17} />}
        tone="bg-status-soon-bg text-status-soon-text"
      />
      <StatCard
        label="Ya vencidos"
        value={String(expiredCount)}
        note="requieren atención"
        icon={<Zap size={17} />}
        tone="bg-status-expired-bg text-status-expired-text"
      />
      <StatCard
        label="Desperdicio evitado"
        value={formatMoney(moneySaved)}
        note={`${kgSaved} kg este mes (estimado)`}
        icon={<ArrowDownRight size={17} />}
        tone="bg-brand-subtle text-brand-text"
      />
    </section>
  );
}
