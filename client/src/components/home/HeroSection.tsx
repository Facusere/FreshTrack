import { ArrowUpRight, ChevronRight, Plus, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { formatTimeAgo } from "@/lib/dates";
import { LastScanInfo } from "@/lib/storage";

export interface HeroSectionProps {
  onOpenScan: () => void;
  onOpenAdd: () => void;
  lastScan: LastScanInfo | null;
  today: Date;
  catalogSize: number;
}

export function HeroSection({
  onOpenScan,
  onOpenAdd,
  lastScan,
  today,
  catalogSize,
}: HeroSectionProps) {
  return (
    <section id="module-summary" className="scroll-mt-24 space-y-6 w-full max-w-full overflow-hidden">
      {/* Forest Depths Hero Canvas Stage */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] bg-[#122314] text-white border border-[#273f2b] px-4 py-7 sm:px-10 sm:py-12 lg:px-14 lg:py-16 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
        {/* Atmospheric Decorative Sprout Orb */}
        <div
          aria-hidden="true"
          className="tomorro-orb absolute -right-24 -top-28 sm:-right-10 sm:-top-20"
        />
        <div
          aria-hidden="true"
          className="tomorro-orb absolute -left-36 -bottom-36 opacity-30"
        />

        <div className="relative z-10 grid gap-8 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: 70% Typography on Flat Forest Surface */}
          <div className="max-w-[580px] space-y-5 sm:space-y-6">
            {/* Event Announcement Pill */}
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

            {/* Display Headline with Accent Word (Ozik Style, tight 0.86 line-height) */}
            <h1 className="font-display text-[34px] sm:text-[52px] lg:text-[68px] leading-[0.92] sm:leading-[0.88] tracking-[-0.018em] text-[#ffffff] font-extrabold break-words">
              Que nada rico termine en la{" "}
              <span className="text-[#68ef3f]">basura.</span>
            </h1>

            {/* Body Paragraph with Pale Fern tone and Sprout highlight */}
            <p className="text-sm sm:text-lg leading-[1.5] text-[#b7bda5] max-w-[520px]">
              FreshTrack digitaliza tus compras con{" "}
              <span className="text-[#68ef3f] font-medium">Reconocimiento OCR</span>, calcula
              vencimientos reales y te avisa a tiempo. Menos desperdicio hogareño, más
              tranquilidad.
            </p>

            {/* Dual CTAs — Filled Sprout & Ghost */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenScan}
                className="tomorro-btn-primary min-h-[46px] text-sm"
              >
                <ScanLine size={17} strokeWidth={2.2} />
                <span>Escanear compra</span>
              </button>
              <button
                type="button"
                onClick={onOpenAdd}
                className="tomorro-btn-ghost min-h-[46px] text-sm hover:border-[#b7bda5]"
              >
                <Plus size={16} strokeWidth={2} />
                <span>Agregar manual</span>
              </button>
            </div>

            {/* Micro Details / Botanical Highlights */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 text-xs text-[#b7bda5]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#273f2b] bg-[#162b19]/80 px-3 py-1 text-[#ffffff]">
                <Sparkles size={13} className="text-[#68ef3f]" />
                {catalogSize} alimentos regionales
              </span>
              <span>·</span>
              <span className="text-[#b7bda5]">Vida útil abierto y cerrado</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#b7bda5]">
                <ShieldCheck size={13} className="text-[#68ef3f]" /> 100% privado
              </span>
            </div>
          </div>

          {/* Right Column: 20% Floating Product Mockup Card Stack at slight tilt */}
          <div className="tomorro-mockup-stack relative flex items-center justify-center pt-4 lg:pt-0">
            {/* Rear Card 2 (Deep ambient tilt) */}
            <div
              aria-hidden="true"
              className="hidden sm:block absolute -right-2 top-2 h-56 w-72 sm:w-80 -rotate-6 rounded-[22px] bg-[#1c331f] border border-[#273f2b]/80 opacity-40 blur-[1px] pointer-events-none"
            />

            {/* Rear Card 1 (Subtle recipe preview) */}
            <div
              aria-hidden="true"
              className="hidden sm:block absolute -left-2 bottom-0 h-52 w-72 sm:w-80 rotate-3 rounded-[22px] bg-[#273f2b] border border-[#38563d] opacity-60 shadow-lg pointer-events-none p-4"
            >
              <div className="flex items-center justify-between text-xs text-[#b7bda5]">
                <span>Sugerencia rápida</span>
                <span className="rounded-full bg-[#68ef3f]/20 px-2 py-0.5 text-[10px] text-[#68ef3f] font-bold">
                  Zero-Waste
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">Tortilla de espinacas y queso</p>
              <p className="mt-1 text-xs text-[#b7bda5]">Aprovecha 2 productos próximos a vencer</p>
            </div>

            {/* Front Card: Crisp White Interface Mockup (Tilted -3 to +3 degrees) */}
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
              className="tomorro-mockup-card relative z-20 w-full max-w-[420px] rotate-0 sm:-rotate-2 cursor-pointer p-4 sm:p-6 text-[#30322a]"
            >
              {/* Top card header */}
              <div className="flex items-center justify-between border-b border-[#d9deca] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f9dd] text-[#273f2b]">
                    <ScanLine size={16} />
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

              {/* Mockup radar items */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-[#f2f5eb] p-2.5 border border-[#d9deca]/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">🥬</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#122314]">Espinaca fresca</p>
                      <p className="text-[11px] text-[#5c6351]">Verduras · 1 atado</p>
                    </div>
                  </div>
                  <span className="tomorro-badge-sprout text-[11px]">4 días restantes</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#fdf5e6] p-2.5 border border-[#edd9b4]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">🥣</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#122314]">Yogur natural</p>
                      <p className="text-[11px] text-[#7a4d0c]">Lácteos · 2 unidades</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-[#f8e7c9] px-2 py-0.5 text-[11px] font-bold text-[#7a4d0c]">
                    Vence pronto
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#f2f5eb] p-2.5 border border-[#d9deca]/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg">🍗</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#122314]">Pechuga de pollo</p>
                      <p className="text-[11px] text-[#5c6351]">Carnes · En freezer</p>
                    </div>
                  </div>
                  <span className="tomorro-badge-sprout text-[11px]">En fecha</span>
                </div>
              </div>

              {/* Bottom actionable footer */}
              <div className="mt-4 flex items-center justify-between pt-2">
                <div className="text-xs">
                  <p className="font-bold text-[#122314]">
                    {lastScan ? `${lastScan.count} productos detectados` : "Listo para escanear"}
                  </p>
                  <p className="text-[11px] text-[#5c6351]">Clic para abrir cámara o imagen</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#68ef3f] text-[#30322a] shadow-xs transition-transform group-hover:scale-105">
                  <ArrowUpRight size={17} strokeWidth={2.4} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Strip under Hero (Muted on Forest Depths canvas) */}
        <div className="relative z-10 mt-10 sm:mt-14 border-t border-[#273f2b] pt-6 sm:pt-8">
          <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-[#b7bda5]">
            Ellos cuidan su despensa con nosotros · más de 100,000 alimentos registrados
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-[#ffffff]/75">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68ef3f]" />
              <span>Detección de vencimientos OCR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68ef3f]" />
              <span>Vida útil para envases abiertos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68ef3f]" />
              <span>Recetas zero-waste automáticas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68ef3f]" />
              <span>Almacenamiento 100% en tu dispositivo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
