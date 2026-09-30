import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingDown,
  AlertOctagon,
  PieChart as PieChartIcon,
} from "lucide-react";
import { ImpactStats, formatMoney } from "@/lib/impactStats";
import { Product } from "@/types/product";
import { ConsumptionRecord } from "@/lib/inventoryConsumption";
import {
  buildMonthlyWasteData,
  buildCategoryWasteData,
  buildTopExpiredProducts,
  hasSufficientReportsData,
} from "@/lib/reportsData";

export interface ReportsSectionProps {
  impact: ImpactStats;
  products: Product[];
  consumptionHistory: ConsumptionRecord[];
  onUndoConsumption: (recordId: number) => void;
}

// Colors referencing Tomorro palette directly
const PIE_COLORS = [
  "#68ef3f", // Electric Sprout
  "#26a200", // Deep Verdant
  "#273f2b", // Moss Shadow
  "#7e8371", // Lichen Sage
  "#b7bda5", // Pale Fern
  "#d97706", // Amber
  "#dc2626", // Red
  "#30322a", // Onyx Olive
];

export function ReportsSection({
  impact,
  products,
  consumptionHistory,
  onUndoConsumption,
}: ReportsSectionProps) {
  const hasData = useMemo(
    () => hasSufficientReportsData(impact, products, consumptionHistory),
    [impact, products, consumptionHistory]
  );

  const monthlyData = useMemo(
    () => buildMonthlyWasteData(impact),
    [impact]
  );

  const categoryData = useMemo(
    () => buildCategoryWasteData(products),
    [products]
  );

  const topExpired = useMemo(
    () => buildTopExpiredProducts(products),
    [products]
  );

  return (
    <section id="module-reports" className="scroll-mt-24 mt-6 space-y-6">
      {/* Header and Summary stats banner */}
      <div className="tomorro-card-bone relative overflow-hidden p-5 sm:p-6 lg:p-7 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6351] dark:text-[#b7bda5]">
              <BarChart3 size={15} className="text-[#26a200] dark:text-[#68ef3f]" /> Estadísticas y Reportes
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#122314] dark:text-white">
              Tu impacto en números y tendencias
            </h2>
            <p className="mt-1 max-w-[560px] text-xs sm:text-sm leading-5 text-[#5c6351] dark:text-[#b7bda5]">
              Monitoreá el desperdicio evitado, los pesos recuperados y descubrí qué categorías requieren mayor atención en tus compras.
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#122314] border border-[#d9deca] dark:border-[#273f2b] px-4 py-3 text-right shadow-xs">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5c6351] dark:text-[#b7bda5]">Acciones registradas</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-[#122314] dark:text-[#68ef3f]">{impact.actions}</p>
            <p className="text-xs text-[#5c6351] dark:text-[#b7bda5]">este mes</p>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white dark:bg-[#122314] border border-[#d9deca] dark:border-[#273f2b] p-4 shadow-xs">
            <p className="text-xs font-semibold text-[#5c6351] dark:text-[#b7bda5]">Comida salvada</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#122314] dark:text-[#68ef3f]">{impact.kgSaved} kg</p>
            <p className="text-xs text-[#5c6351] dark:text-[#b7bda5]">estimado acumulado</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#122314] border border-[#d9deca] dark:border-[#273f2b] p-4 shadow-xs">
            <p className="text-xs font-semibold text-[#5c6351] dark:text-[#b7bda5]">Valor recuperado</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#122314] dark:text-[#68ef3f]">{formatMoney(impact.moneySaved)}</p>
            <p className="text-xs text-[#5c6351] dark:text-[#b7bda5]">estimado acumulado</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-[#122314] border border-[#d9deca] dark:border-[#273f2b] p-4 shadow-xs">
            <p className="text-xs font-semibold text-[#5c6351] dark:text-[#b7bda5]">Comidas posibles</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#122314] dark:text-[#68ef3f]">{impact.mealsSaved}</p>
            <p className="text-xs text-[#5c6351] dark:text-[#b7bda5]">porciones aprovechadas</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <div
          data-testid="reports-empty-state"
          className="rounded-[24px] border border-dashed border-line bg-surface p-10 text-center shadow-[0_8px_24px_rgba(55,63,48,0.02)]"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-subtle text-brand-text">
            <BarChart3 size={28} />
          </div>
          <h3 className="mt-4 font-serif text-xl font-semibold text-content-heading">
            Todavía no hay suficientes datos, volvé en unas semanas.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-content-muted">
            A medida que agregues productos, consumas recetas o se cumplan fechas de vencimiento, FreshTrack generará automáticamente tus gráficos de ahorro y patrones de consumo.
          </p>
        </div>
      ) : (
        /* Charts Grid */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart 1: Bar chart - Desperdicio evitado por mes */}
          <div className="card-3d relative overflow-hidden rounded-[24px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-content-muted">
                  <TrendingDown size={14} className="text-brand" /> Ahorro histórico
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-content-heading">
                  Desperdicio evitado por mes
                </h3>
              </div>
              <span className="rounded-full bg-brand-subtle px-2.5 py-0.5 text-xs font-bold text-brand-text border border-brand-border/40">
                kg y pesos
              </span>
            </div>
            <p className="mt-1 text-xs text-content-muted">
              {monthlyData.some((d) => d.isProjection)
                ? "* Meses anteriores proyectados en base a tu ritmo actual."
                : "Datos reales registrados en este dispositivo."}
            </p>

            <div className="mt-6 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="var(--content-muted)" fontSize={12} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--brand)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `${v}kg`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--status-soon-dot)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--line)",
                      borderRadius: "14px",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === "Comida salvada") return [`${value} kg`, name];
                      if (name === "Valor ahorrado") return [`$${Number(value).toLocaleString("es-AR")}`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="kg"
                    name="Comida salvada"
                    fill="var(--brand)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="pesos"
                    name="Valor ahorrado"
                    fill="var(--status-soon-dot)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Donut / Pie chart - Categorías con más productos vencidos */}
          <div className="card-3d relative overflow-hidden rounded-[24px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-status-expired-text">
                  <PieChartIcon size={14} /> Dónde se pierde más
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-content-heading">
                  Categorías con más vencimientos
                </h3>
              </div>
              <span className="rounded-full bg-status-expired-bg px-2.5 py-0.5 text-xs font-bold text-status-expired-text border border-status-expired-border">
                {categoryData.reduce((sum, c) => sum + c.count, 0)} items vencidos
              </span>
            </div>
            <p className="mt-1 text-xs text-content-muted">
              Identificá qué tipo de alimento se suele pasar antes de ser consumido.
            </p>

            <div className="mt-6 flex h-[260px] w-full items-center justify-center">
              {categoryData.length === 0 ? (
                <div className="text-center text-xs text-content-muted">
                  <p className="text-2xl">🎉</p>
                  <p className="mt-2 font-semibold text-brand-text">¡Sin vencimientos registrados!</p>
                  <p className="mt-0.5">Tus productos están al día.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.category}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--line)",
                        borderRadius: "14px",
                        fontSize: "12px",
                      }}
                      formatter={(value: any, name: any) => [
                        `${value} producto(s)`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top 5 productos que más se vencen */}
          <div className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-status-expired-text">
                  <AlertOctagon size={14} /> Atención especial
                </p>
                <h3 className="mt-1 font-serif text-xl font-semibold text-content-heading">
                  Top 5 productos que más se vencen
                </h3>
              </div>
              <p className="text-xs text-content-muted">Comprá menos cantidad o ajustá la fecha en la próxima compra</p>
            </div>

            {topExpired.length === 0 ? (
              <div className="py-8 text-center text-xs text-content-muted">
                No tenés productos vencidos registrados en este momento.
              </div>
            ) : (
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {topExpired.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col justify-between rounded-2xl bg-surface-subtle border border-line p-3.5 transition hover:bg-surface"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-status-expired-bg text-xs font-bold text-status-expired-text border border-status-expired-border">
                        #{item.rank}
                      </span>
                      <span className="text-lg">{item.icon || "📦"}</span>
                    </div>
                    <div className="mt-3">
                      <p className="truncate text-xs font-bold text-content-heading">{item.name}</p>
                      <p className="truncate text-xs text-content-muted">{item.category}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-xs">
                      <span className="text-content-muted">Vencido</span>
                      <span className="font-bold text-status-expired-text">
                        {item.count} {item.count === 1 ? "vez" : "veces"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent consumption history */}
      {consumptionHistory.length > 0 && (
        <div className="rounded-[24px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Historial reciente</p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-content-heading">Últimos consumos aprovechados</h3>
            </div>
            <p className="text-xs text-content-muted">Podés deshacer acciones si te equivocaste</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {consumptionHistory.slice().reverse().map((record) => (
              <div key={record.id} className="rounded-2xl bg-surface-subtle p-3 border border-line">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-content-heading">{record.title}</p>
                  <span className="text-xs text-content-muted">{record.createdAt}</span>
                </div>
                <p className="mt-1 text-xs text-content-muted">{record.ingredients.join(", ") || "Sin ingredientes"}</p>
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
        </div>
      )}
    </section>
  );
}
