import React from "react";
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
    <div className="card-3d relative overflow-hidden rounded-[22px] border border-line bg-surface p-4 sm:p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)] transition duration-300 hover:border-brand-border/60">
      {/* 3D Top Specular Light Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/15" />
      
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-105 ${tone}`}>
          {icon}
        </span>
        {badge && (
          <span className="whitespace-nowrap rounded-full border border-line/70 bg-surface-subtle px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-content-muted">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold tracking-[-0.04em] text-content-heading sm:text-3xl">{value}</p>
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
        icon={<PackageOpen size={18} />}
        tone="bg-status-ok-bg text-status-ok-text"
        badge="Stock"
      />
      <StatCard
        label="Por vencer"
        value={String(soonCount)}
        note={`en los próximos ${soonThresholdDays} días`}
        icon={<Clock3 size={18} />}
        tone="bg-status-soon-bg text-status-soon-text"
        badge="Prioridad"
      />
      <StatCard
        label="Ya vencidos"
        value={String(expiredCount)}
        note="requieren atención"
        icon={<Zap size={18} />}
        tone="bg-status-expired-bg text-status-expired-text"
        badge="Alerta"
      />
      <StatCard
        label="Desperdicio evitado"
        value={formatMoney(moneySaved)}
        note={`${kgSaved} kg este mes (estimado)`}
        icon={<ArrowDownRight size={18} />}
        tone="bg-brand-subtle text-brand-text"
        badge="Impacto"
      />
    </section>
  );
}
