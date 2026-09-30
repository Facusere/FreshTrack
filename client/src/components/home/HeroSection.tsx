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
      {/* Forest Depths Hero Canvas Stage */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-[#122314] text-white border border-[#273f2b] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
        {/* Atmospheric Decorative Sprout Orb */}
        <div
          aria-hidden="true"
          className="tomorro-orb absolute -right-24 -top-28 sm:-right-10 sm:-top-20"
        />
        <div
          aria-hidden="true"
          className="tomorro-orb absolute -left-36 -bottom-36 opacity-25"
        />

        <div className="relative z-10 grid gap-6 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: 70% Typography on Flat Forest Surface */}
          <div className="max-w-[560px] space-y-4 sm:space-y-5">
            {/* Announcement Pill */}
            <div className="inline-block max-w-full">
              <button
                type="button"
                onClick={onOpenScan}
                className="tomorro-announcement-pill max-w-full group cursor-pointer text-left text-xs sm:text-[13px]"
              >
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#68ef3f] animate-pulse" />
                <span className="truncate">
                  Motor OCR inteligente ·{" "}
                  <span className="text-[#68ef3f] font-semibold">escaneo sin conexión</span>
                </span>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-[#b7bda5] transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </button>
            </div>

            {/* Display Headline with Accent Word (Ozik Style, tight 0.88 line-height) */}
            <h1 className="font-display text-[32px] sm:text-[46px] lg:text-[54px] leading-[0.92] sm:leading-[0.88] tracking-[-0.018em] text-[#ffffff] font-extrabold break-words">
              Que nada rico termine en la{" "}
              <span className="text-[#68ef3f]">basura.</span>
            </h1>

            {/* Body Paragraph with Pale Fern tone */}
            <p className="text-xs sm:text-base leading-[1.55] text-[#b7bda5] max-w-[480px]">
              FreshTrack digitaliza tus compras con{" "}
              <span className="text-[#68ef3f] font-medium">Reconocimiento OCR</span>, estima
              vencimientos y te avisa a tiempo. Menos desperdicio, más tranquilidad.
            </p>

            {/* Dual CTAs — Filled Sprout & Ghost */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenScan}
                className="tomorro-btn-primary min-h-[42px] text-xs sm:text-sm"
              >
                <ScanLine size={16} strokeWidth={2.2} />
                <span>Escanear compra</span>
              </button>
              <button
                type="button"
                onClick={onOpenAdd}
                className="tomorro-btn-ghost min-h-[42px] text-xs sm:text-sm hover:border-[#b7bda5]"
              >
                <Plus size={15} strokeWidth={2} />
                <span>Agregar manual</span>
              </button>
            </div>

            {/* Micro Details */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] sm:text-xs text-[#b7bda5]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#273f2b] bg-[#162b19]/80 px-2.5 py-0.5 text-[#ffffff]">
                <Sparkles size={12} className="text-[#68ef3f]" />
                {catalogSize} alimentos regionales
              </span>
              <span>·</span>
              <span className="text-[#b7bda5]">Vida útil abierto y cerrado</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#b7bda5]">
                <ShieldCheck size={12} className="text-[#68ef3f]" /> 100% privado
              </span>
            </div>
          </div>

          {/* Right Column: Floating Product Mockup Card */}
          <div className="tomorro-mockup-stack relative flex items-center justify-center pt-2 lg:pt-0">
            {/* Rear Ambient Card */}
            <div
              aria-hidden="true"
              className="hidden sm:block absolute -right-2 top-2 h-52 w-72 sm:w-80 -rotate-3 rounded-[20px] bg-[#1c331f] border border-[#273f2b]/80 opacity-40 blur-[1px] pointer-events-none"
            />

            {/* Front Card: Crisp White Interface Mockup with REAL Pantry Radar */}
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
              className="tomorro-mockup-card relative z-20 w-full max-w-[400px] rotate-0 sm:-rotate-2 cursor-pointer p-4 sm:p-5 text-[#30322a]"
            >
              {/* Top card header */}
              <div className="flex items-center justify-between border-b border-[#d9deca] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e7f9dd] text-[#273f2b]">
                    <ScanLine size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-bold tracking-tight text-[#122314]">Radar de Despensa</p>
                    <p className="text-[11px] text-[#5c6351]">
                      {lastScan ? `Último ticket: ${formatTimeAgo(lastScan.at, today)}` : "Estado en tiempo real"}
                    </p>
                  </div>
                </div>
                <span className="tomorro-tag-beacon">En Vivo</span>
              </div>

              {/* Real radar items */}
              <div className="mt-3.5 space-y-2">
                {radarProducts.length > 0 ? (
                  radarProducts.map((p) => {
                    const badgeClass =
                      p.status === "expired"
                        ? "bg-[#fdf1ef] text-[#8e2b20] border-[#f8c9c3]"
                        : p.status === "soon"
                        ? "bg-[#fdf5e6] text-[#7a4d0c] border-[#edd9b4]"
                        : "bg-[#e7f9dd] text-[#1c3e21] border-[#b7bda5]";
                    const badgeText =
                      p.status === "expired"
                        ? "Vencido"
                        : p.status === "soon"
                        ? `${p.days}d restantes`
                        : "En fecha";

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-[#f2f5eb] p-2 border border-[#d9deca]/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg">{p.icon}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#122314]">{p.name}</p>
                            <p className="text-[11px] text-[#5c6351]">
                              {p.category} · {p.quantity}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl bg-[#f8faf5] p-3 text-center border border-[#d9deca]/60">
                    <p className="text-xs font-bold text-[#122314]">Tu despensa está lista</p>
                    <p className="mt-0.5 text-[11px] text-[#5c6351]">
                      Escaneá un ticket para cargar alimentos y activar el radar de vencimientos.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom actionable footer */}
              <div className="mt-3.5 flex items-center justify-between border-t border-[#d9deca]/50 pt-2.5">
                <div className="text-xs">
                  <p className="font-bold text-[#122314]">
                    {products.length > 0
                      ? `${products.length} ${products.length === 1 ? "alimento activo" : "alimentos activos"}`
                      : "Listo para escanear"}
                  </p>
                  <p className="text-[11px] text-[#5c6351]">
                    {lastScan ? `${lastScan.count} en último escaneo` : "Cámara o imagen"}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#68ef3f] text-[#30322a] shadow-xs transition-transform group-hover:scale-105">
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
