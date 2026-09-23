import { useMemo, useState } from "react";
import { Check, ChevronRight, Grid2X2, List, Refrigerator, Sparkles, Utensils } from "lucide-react";
import type { Product } from "@/types/product";

const shelves = ["Lácteos", "Verduras frescas", "Carnes", "Almacén seco"];

function statusCopy(product: Product) {
  if (product.status === "expired") return { label: "Caducado", className: "bg-status-expired-bg text-status-expired-text border-status-expired-border" };
  if (product.status === "soon") return { label: `${product.days} días`, className: "bg-status-soon-bg text-status-soon-text border-status-soon-border" };
  return { label: "Fresco", className: "bg-status-ok-bg text-status-ok-text border-status-ok-border" };
}

export function InteractiveExperience({ products, onConsume, onOpenScan }: { products: Product[]; onConsume: (product: Product) => void; onOpenScan: () => void }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Product | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const grouped = useMemo(() => shelves.map((shelf) => ({ shelf, items: products.filter((p) => p.category === shelf).slice(0, 3) })), [products]);

  return (
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]" aria-label="Vista inteligente de FreshTrack">
      <div className="relative overflow-hidden rounded-[28px] border border-brand-border bg-[radial-gradient(circle_at_75%_20%,var(--brand-subtle),transparent_42%),var(--surface)] p-5 shadow-[0_18px_50px_rgba(55,63,48,0.08)] sm:p-7">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-text"><Refrigerator size={15} /> Vista de tu despensa</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-0.04em] text-content-heading sm:text-[30px]">Todo fresco, a simple vista</h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-content-muted">Seleccioná un alimento para verlo, arrastralo entre estantes o marcá lo que ya consumiste.</p>
          </div>
          <button type="button" onClick={onOpenScan} className="hidden min-h-[40px] items-center gap-2 rounded-xl bg-brand px-3.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-hover sm:inline-flex"><Sparkles size={14} /> Alta rápida</button>
        </div>
        <div className="perspective-[900px] relative mx-auto mt-6 max-w-[680px] rounded-[22px] border border-line-strong bg-surface-muted/70 p-3 shadow-inner sm:p-4">
          <div className="preserve-3d rounded-[16px] border border-brand-border bg-surface p-2 shadow-[inset_0_0_35px_rgba(60,80,45,0.08)] transition-transform duration-500 hover:rotate-y-1">
            {grouped.map(({ shelf, items }) => (
              <div key={shelf} onDragOver={(e) => e.preventDefault()} onDrop={() => setDragged(null)} className="relative border-b border-line-subtle p-2.5 last:border-0 sm:p-3">
                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.12em] text-content-muted">{shelf}</span><span className="text-xs text-content-muted">{items.length} items</span></div>
                <div className="grid min-h-[54px] grid-cols-3 gap-2">
                  {items.map((product) => { const status = statusCopy(product); return <button key={product.id} type="button" draggable onDragStart={() => setDragged(product.id)} onClick={() => setSelected(product)} className={`group flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition duration-200 hover:-translate-y-1 hover:shadow-md ${dragged === product.id ? "scale-95 opacity-50" : "border-line bg-surface"}`}><span className="text-xl transition-transform group-hover:scale-110">{product.icon}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-content-heading">{product.name}</span><span className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span></span></button>; })}
                </div>
                <div className="absolute inset-x-2 bottom-0 h-px bg-brand/20" />
              </div>
            ))}
          </div>
        </div>
        {selected && <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-subtle/60 p-3"><div className="flex min-w-0 items-center gap-3"><span className="text-2xl">{selected.icon}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-brand-text">{selected.name}</p><p className="text-xs text-content-muted">{selected.quantity} · vence {selected.expiry}</p></div></div><button type="button" onClick={() => { onConsume(selected); setSelected(null); }} className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand-hover"><Check size={14} /> Consumido</button></div>}
      </div>
      <div className="rounded-[28px] border border-line bg-surface p-5 shadow-[0_12px_35px_rgba(55,63,48,0.05)] sm:p-7">
        <div className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-content-muted"><Utensils size={15} className="text-brand" /> Acciones rápidas</p><h3 className="mt-2 font-serif text-2xl font-semibold text-content-heading">Tu próximo paso</h3></div><div className="flex rounded-xl bg-surface-elevated p-1"><button type="button" aria-label="Vista grilla" onClick={() => setView("grid")} className={`rounded-lg p-2 ${view === "grid" ? "bg-surface text-brand shadow-sm" : "text-content-muted"}`}><Grid2X2 size={15} /></button><button type="button" aria-label="Vista lista" onClick={() => setView("list")} className={`rounded-lg p-2 ${view === "list" ? "bg-surface text-brand shadow-sm" : "text-content-muted"}`}><List size={15} /></button></div></div>
        <div className={`mt-5 grid gap-2.5 ${view === "grid" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {products.filter((p) => p.status !== "ok").slice(0, 4).map((product) => { const status = statusCopy(product); return <button key={product.id} type="button" onClick={() => setSelected(product)} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface-muted p-3 text-left transition hover:-translate-y-0.5 hover:border-brand-border hover:bg-brand-subtle/40"><span className="text-2xl">{product.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-content-heading">{product.name}</span><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span></span><ChevronRight size={15} className="text-content-muted transition group-hover:translate-x-1" /></button>; })}
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface-subtle p-4"><p className="text-xs font-bold text-content-heading">Consejo de hoy</p><p className="mt-1 text-xs leading-5 text-content-muted">Priorizá los productos con alerta y convertí dos ingredientes en una comida antes de comprar algo nuevo.</p></div>
      </div>
    </section>
  );
}

export default InteractiveExperience;
