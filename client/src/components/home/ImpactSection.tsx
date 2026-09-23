import React from "react";
import { ArrowDownRight } from "lucide-react";
import { formatMoney, ImpactStats } from "@/lib/impactStats";
import { ConsumptionRecord } from "@/lib/inventoryConsumption";

export interface ImpactSectionProps {
  impact: ImpactStats;
  consumptionHistory: ConsumptionRecord[];
  onUndoConsumption: (recordId: number) => void;
}

export function ImpactSection({
  impact,
  consumptionHistory,
  onUndoConsumption,
}: ImpactSectionProps) {
  return (
    <>
      {consumptionHistory.length > 0 && (
        <section className="mt-5 rounded-[24px] border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Actividad reciente</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-content-heading">Últimos consumos</h2>
            </div>
            <p className="text-xs text-content-muted">Podés deshacer varias acciones</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {consumptionHistory.slice().reverse().map((record) => (
              <div key={record.id} className="rounded-2xl bg-surface-subtle p-3 border border-line">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-content-heading">{record.title}</p>
                  <span className="text-xs text-content-muted">{record.createdAt}</span>
                </div>
                <p className="mt-1 text-xs text-content-muted">{record.ingredients.join(", ") || "Sin coincidencias"}</p>
                <button
                  type="button"
                  onClick={() => onUndoConsumption(record.id)}
                  className="mt-2 min-h-[44px] rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-brand-text hover:bg-surface"
                >
                  Deshacer desde acá
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="module-impact" className="scroll-mt-24 mt-5 rounded-[24px] border border-brand-border bg-brand-subtle/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-text">
              <ArrowDownRight size={14} /> Impacto de este mes
            </p>
            <h2 className="mt-2 font-serif text-2xl sm:text-[26px] font-semibold tracking-[-0.04em] text-content-heading">
              Pequeños gestos, menos desperdicio.
            </h2>
            <p className="mt-1 max-w-[500px] text-xs sm:text-sm leading-5 text-content-body">
              Cada vez que aprovechás algo a tiempo, FreshTrack lo suma. Sin rankings ni presión: solo una señal amable de lo que estás logrando.
            </p>
          </div>
          <div className="rounded-2xl bg-surface/80 border border-line px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">Acciones</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-brand-text">{impact.actions}</p>
            <p className="text-xs text-content-muted">este mes</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-surface/80 border border-line p-3">
            <p className="text-xs font-semibold text-content-muted">Comida salvada</p>
            <p className="mt-1 text-xl font-semibold text-brand-text">{impact.kgSaved} kg</p>
            <p className="text-xs text-content-muted">(estimado)</p>
          </div>
          <div className="rounded-2xl bg-surface/80 border border-line p-3">
            <p className="text-xs font-semibold text-content-muted">Valor recuperado</p>
            <p className="mt-1 text-xl font-semibold text-brand-text">{formatMoney(impact.moneySaved)}</p>
            <p className="text-xs text-content-muted">(estimado)</p>
          </div>
          <div className="rounded-2xl bg-surface/80 border border-line p-3">
            <p className="text-xs font-semibold text-content-muted">Comidas posibles</p>
            <p className="mt-1 text-xl font-semibold text-brand-text">{impact.mealsSaved}</p>
            <p className="text-xs text-content-muted">(estimado)</p>
          </div>
        </div>
      </section>
    </>
  );
}
