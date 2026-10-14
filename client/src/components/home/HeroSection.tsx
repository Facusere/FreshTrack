import { useMemo } from "react";
import { ArrowUpRight, ChevronRight, Plus, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { formatTimeAgo } from "@/lib/dates";
import { LastScanInfo } from "@/lib/storage";
import { Product } from "@/types/product";

export interface HeroSectionProps {
  onOpenScan: () => void;
  onOpenAdd: () => void;
  lastScan: LastScanInfo | null;
  today: Date;
  catalogSize: number;
  products?: Product[];
}

export function HeroSection({
  onOpenScan,
  onOpenAdd,
  lastScan,
  today,
  catalogSize,
  products = [],
}: HeroSectionProps) {
  // Select top 3 items to show in radar: expiring soon or expired first, then ok
  const radarProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products]
      .sort((a, b) => {
        const order = { expired: 0, soon: 1, ok: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return a.days - b.days;
      })
      .slice(0, 3);
  }, [products]);

  return (
    <section id="module-summary" className="scroll-mt-24 space-y-4 w-full max-w-full overflow-hidden">
      {/* Modern Adaptive Emerald Canvas Stage */}
      <div className="relative overflow-hidden rounded-[26px] sm:rounded-[32px] bg-gradient-to-br from-[#e6f4ea] via-[#daf0e2] to-[#eaf6ee] dark:from-[#0a1710] dark:via-[#0f251a] dark:to-[#07140d] text-slate-900 dark:text-white border border-emerald-300/80 dark:border-emerald-900/50 px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-9 shadow-[0_16px_40px_-10px_rgba(16,185,129,0.15),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_24px_60px_-15px_rgba(16,185,129,0.22),0_12px_32px_rgba(0,0,0,0.35)] transition-colors duration-200">
        {/* Atmospheric Decorative Glow Orbs */}
        <div
          aria-hidden="true"
          className="tomorro-orb absolute -right-20 -top-24 sm:-right-8 sm:-top-16 opacity-60 dark:opacity-70"
        />
        <div
          aria-hidden="true"
          className="tomorro-orb absolute -left-36 -bottom-36 opacity-30 dark:opacity-30"
        />

        <div className="relative z-10 grid gap-7 sm:gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: Typography & CTAs */}
          <div className="max-w-[560px] space-y-4 sm:space-y-5">
            {/* Announcement Pill with live status beacon */}
            <div className="inline-block max-w-full">
              <button
                type="button"
                onClick={onOpenScan}
                className="tomorro-announcement-pill max-w-full group cursor-pointer text-left text-xs sm:text-[13px] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all"
              >
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="truncate">
                  Motor OCR inteligente ·{" "}
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">escaneo sin conexión</span>
                </span>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-emerald-600 dark:text-emerald-200 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>

            {/* Display Headline with Gradient Accent */}
            <h1 className="font-display text-[32px] sm:text-[44px] lg:text-[52px] leading-[1.12] tracking-tight text-slate-900 dark:text-white font-extrabold break-words">
              Que nada rico termine en la{" "}
              <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-600 dark:from-emerald-400 dark:via-teal-300 dark:to-green-300 bg-clip-text text-transparent font-extrabold">
                basura.
              </span>
            </h1>

            {/* Body Paragraph */}
            <p className="text-xs sm:text-base leading-[1.65] text-slate-800 dark:text-emerald-50 max-w-[500px] font-normal">
              FreshTrack digitaliza tus compras con{" "}
              <strong className="text-emerald-900 dark:text-emerald-300 font-bold">Reconocimiento OCR</strong>, estima
              vencimientos y te avisa a tiempo. Menos desperdicio, más tranquilidad.
            </p>

            {/* Dual CTAs — Emerald Gradient & Frosted Ghost */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenScan}
                className="tomorro-btn-primary min-h-[44px] text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all"
              >
                <ScanLine size={16} strokeWidth={2.4} />
                <span>Escanear compra</span>
              </button>
              <button
                type="button"
                onClick={onOpenAdd}
                className="tomorro-btn-ghost min-h-[44px] text-xs sm:text-sm shadow-2xs"
              >
                <Plus size={15} strokeWidth={2.4} />
                <span>Agregar manual</span>
              </button>
            </div>

            {/* Micro Details */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] sm:text-xs text-slate-700 dark:text-emerald-100 font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/80 bg-white/90 dark:border-emerald-700/60 dark:bg-emerald-950/80 px-3 py-1 text-emerald-950 dark:text-emerald-100 backdrop-blur-sm shadow-2xs font-semibold">
                <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                {catalogSize} alimentos regionales
              </span>
              <span>·</span>
              <span className="text-slate-800 dark:text-emerald-100">Vida útil abierto y cerrado</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-800 dark:text-emerald-100">
                <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" /> 100% privado
              </span>
            </div>
          </div>

          {/* Right Column: Floating Product Mockup Card */}
          <div className="tomorro-mockup-stack relative flex items-center justify-center pt-2 lg:pt-0">
            {/* Subtle soft ambient glow (radial, no sharp geometry or rotated triangles) */}
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none"
            />

            {/* Front Card: Crisp Interface Mockup with REAL Pantry Radar */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Abrir escáner de tickets"
              onClick={onOpenScan}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenScan();
                }
              }}
              className="tomorro-mockup-card group relative z-20 w-full max-w-[420px] cursor-pointer p-4 sm:p-5 text-slate-800 dark:text-slate-100 bg-white dark:bg-[#111a14] backdrop-blur-md border border-emerald-200/90 dark:border-emerald-800/50 shadow-[0_16px_40px_rgba(15,23,19,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.38)]"
            >
              {/* Top card header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800/40 shadow-2xs">
                    <ScanLine size={16} strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">Radar de Despensa</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      {lastScan ? `Último ticket: ${formatTimeAgo(lastScan.at, today)}` : "Estado en tiempo real"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  En Vivo
                </span>
              </div>

              {/* Real radar items */}
              <div className="mt-3.5 space-y-2">
                {radarProducts.length > 0 ? (
                  radarProducts.map((p) => {
                    const badgeClass =
                      p.status === "expired"
                        ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800/60"
                        : p.status === "soon"
                        ? "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/60"
                        : "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/60";
                    const badgeText =
                      p.status === "expired"
                        ? "Vencido"
                        : p.status === "soon"
                        ? `${p.days}d restantes`
                        : "En fecha";

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50/90 dark:bg-[#16241b] p-2.5 border border-slate-200/80 dark:border-emerald-900/30 transition hover:bg-emerald-50 dark:hover:bg-[#1b2d22]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{p.icon}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300">
                              {p.category} · {p.quantity}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl bg-slate-50 dark:bg-[#16241b] p-3.5 text-center border border-dashed border-slate-300 dark:border-emerald-900/40">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Tu despensa está lista</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                      Escaneá un ticket para cargar alimentos y activar el radar de vencimientos.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom actionable footer */}
              <div className="mt-3.5 flex items-center justify-between border-t border-slate-200 dark:border-emerald-900/30 pt-2.5">
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {products.length > 0
                      ? `${products.length} ${products.length === 1 ? "alimento activo" : "alimentos activos"}`
                      : "Listo para escanear"}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {lastScan ? `${lastScan.count} en último escaneo` : "Cámara o imagen"}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
                  <ArrowUpRight size={15} strokeWidth={2.4} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
