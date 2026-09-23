import React from "react";
import { ArrowUpRight, Plus, ScanLine } from "lucide-react";
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
    <section id="module-summary" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left hero banner */}
      <div className="relative overflow-hidden rounded-[26px] bg-brand-subtle/60 px-6 py-7 sm:px-8 sm:py-9 border border-brand-border/40">
        <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[28px] border-brand-border/30" />
        <div className="absolute -bottom-20 right-16 h-40 w-40 rounded-full border-[20px] border-brand-subtle/65" />
        <div className="relative max-w-[470px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-text">
            <span className="h-2 w-2 rounded-full bg-status-ok-dot" /> Tu despensa, en calma
          </div>
          <h1 className="mt-4 max-w-[450px] font-serif text-[36px] font-semibold leading-[0.98] tracking-[-0.045em] text-content sm:text-[47px]">
            Que nada rico<br />
            <span className="italic text-brand">termine en la basura.</span>
          </h1>
          <p className="mt-4 max-w-[380px] text-xs sm:text-sm leading-6 text-content-body">
            FreshTrack lee tus tickets, estima vencimientos y te avisa justo a tiempo. Menos carga manual, más comida aprovechada.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenScan}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white shadow-[0_10px_20px_rgba(31,73,58,0.18)] transition hover:bg-brand-hover active:scale-[0.97]"
            >
              <ScanLine size={16} /> Escanear compra
            </button>
            <button
              type="button"
              onClick={onOpenAdd}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-border bg-surface px-4 py-3 text-xs font-bold text-brand-text transition hover:bg-surface-elevated"
            >
              <Plus size={15} /> Agregar manual
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-brand-text">
            <span className="rounded-full bg-surface px-2.5 py-1 border border-line">
              {catalogSize} productos regionales
            </span>
            <span>·</span>
            <span>vida útil abierto / cerrado</span>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-content-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-status-ok-dot" />
            <span>Tus datos se guardan únicamente en este dispositivo.</span>
          </div>
        </div>
      </div>

      {/* Right interactive card */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Abrir escáner de tickets"
        aria-describedby="scan-card-description"
        onClick={onOpenScan}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenScan();
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const rotateX = ((e.clientY - rect.top) / rect.height - 0.5) * -5;
          const rotateY = ((e.clientX - rect.left) / rect.width - 0.5) * 7;
          e.currentTarget.style.setProperty("--scan-rotate-x", `${rotateX}deg`);
          e.currentTarget.style.setProperty("--scan-rotate-y", `${rotateY}deg`);
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty("--scan-rotate-x", "0deg");
          e.currentTarget.style.setProperty("--scan-rotate-y", "0deg");
        }}
        className="scan-card-3d group relative min-h-[300px] cursor-pointer overflow-hidden rounded-[26px] bg-surface-elevated shadow-[0_14px_35px_rgba(74,79,55,0.09)] border border-line"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.03]"
          style={{ backgroundImage: "url('/groceries.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-content/90 via-content/25 to-transparent" />
        <div className="pointer-events-none absolute inset-0 [perspective:900px]">
          <div className="freshtrack-float-card absolute right-7 top-20 hidden w-36 rotate-[7deg] rounded-2xl border border-white/20 bg-surface/85 p-3 text-content-heading shadow-2xl backdrop-blur-md sm:block">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-content-muted">
              <span>Ticket leído</span>
              <span className="h-2 w-2 rounded-full bg-status-ok-dot" />
            </div>
            <div className="mt-3 h-1.5 w-20 rounded-full bg-brand/70" />
            <div className="mt-2 h-1.5 w-28 rounded-full bg-content-muted/25" />
            <div className="mt-2 h-1.5 w-16 rounded-full bg-content-muted/25" />
            <div className="mt-4 flex items-end justify-between">
              <span className="text-[10px] text-content-muted">Productos</span>
              <span className="font-serif text-xl font-semibold text-brand-text">{lastScan?.count ?? 0}</span>
            </div>
          </div>
          <div className="freshtrack-float-card freshtrack-float-card-delayed absolute bottom-28 right-24 hidden rotate-[-8deg] rounded-xl border border-white/20 bg-accent-lime px-3 py-2 text-accent-lime-fg shadow-xl sm:block">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-lime-fg" /> Vencimientos bajo control
            </div>
          </div>
        </div>
        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-bold text-brand-text backdrop-blur-sm border border-line">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ok-dot" />{" "}
          {lastScan ? `Último escaneo · ${formatTimeAgo(lastScan.at, today)}` : "Sin escaneos recientes"}
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white">
          <div>
            {lastScan ? (
              <>
                <p id="scan-card-description" className="text-xs font-medium text-brand-subtle">Compra registrada</p>
                <p className="mt-1 font-serif text-2xl font-semibold tracking-[-0.03em]">
                  {lastScan.count} {lastScan.count === 1 ? "producto detectado" : "productos detectados"}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-brand-subtle">Comenzá ahora</p>
                <p className="mt-1 font-serif text-2xl font-semibold tracking-[-0.03em]">
                  Escaneá tu primer ticket
                </p>
              </>
            )}
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-lime text-accent-lime-fg">
            <ArrowUpRight size={18} />
          </div>
        </div>
      </div>
    </section>
  );
}
