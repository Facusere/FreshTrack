import { useMemo, useState } from "react";
import { Check, ChevronRight, Grid2X2, List, Refrigerator, Sparkles, Utensils } from "lucide-react";
import type { Product } from "@/types/product";

const shelves = ["Lácteos", "Verduras frescas", "Carnes", "Almacén seco"];

function statusCopy(product: Product) {
  if (product.status === "expired") {
    return {
      label: "Caducado",
      className: "bg-[#fdf1ef] text-[#8e2b20] border-[#f8c9c3] dark:bg-[#2e1816] dark:text-[#f59c90] dark:border-[#4a2420]",
    };
  }
  if (product.status === "soon") {
    return {
      label: `${product.days} ${product.days === 1 ? "día" : "días"}`,
      className: "bg-[#fdf5e6] text-[#7a4d0c] border-[#edd9b4] dark:bg-[#2b2314] dark:text-[#f5cf7d] dark:border-[#44351a]",
    };
  }
  return {
    label: "En fecha",
    className: "bg-[#e7f9dd] text-[#1c3e21] border-[#b7bda5] dark:bg-[#1c3520] dark:text-[#68ef3f] dark:border-[#273f2b]",
  };
}

export function InteractiveExperience({
  products,
  onConsume,
  onOpenScan,
}: {
  products: Product[];
  onConsume: (product: Product) => void;
  onOpenScan: () => void;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Product | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  const grouped = useMemo(
    () =>
      shelves.map((shelf) => ({
        shelf,
        items: products.filter((p) => p.category === shelf).slice(0, 3),
      })),
    [products]
  );

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]" aria-label="Vista inteligente de FreshTrack">
      {/* Left Shelf Box: Greenhouse Bench / Forest Hybrid Stage */}
      <div className="tomorro-card-bone relative overflow-hidden p-5 sm:p-7 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6351] dark:text-[#b7bda5]">
              <Refrigerator size={15} className="text-[#26a200] dark:text-[#68ef3f]" /> Estantes de tu despensa
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[#122314] dark:text-[#ffffff]">
              Todo fresco, <span className="font-serif italic font-normal text-[#273f2b] dark:text-[#68ef3f]">a simple vista</span>
            </h2>
            <p className="mt-1 max-w-md text-xs leading-5 text-[#5c6351] dark:text-[#b7bda5]">
              Arrastrá productos entre estantes, tocalos para inspeccionarlos o marcalos como consumidos.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenScan}
            className="tomorro-btn-primary hidden min-h-[40px] text-xs sm:inline-flex"
          >
            <Sparkles size={14} /> Alta rápida
          </button>
        </div>

        {/* Shelves Canvas */}
        <div className="relative mx-auto mt-6 max-w-[680px] rounded-[22px] border border-[#d9deca] dark:border-[#273f2b] bg-white/70 dark:bg-[#122314]/80 p-3 sm:p-4">
          <div className="rounded-[16px] border border-[#d9deca]/60 dark:border-[#273f2b] bg-[#f8faf5] dark:bg-[#162b19] p-2">
            {grouped.map(({ shelf, items }) => (
              <div
                key={shelf}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => setDragged(null)}
                className="relative border-b border-[#d9deca]/70 dark:border-[#273f2b] p-2.5 last:border-0 sm:p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#5c6351] dark:text-[#b7bda5]">
                    {shelf}
                  </span>
                  <span className="text-xs text-[#5c6351] dark:text-[#b7bda5]">
                    {items.length} {items.length === 1 ? "alimento" : "alimentos"}
                  </span>
                </div>
                <div className="grid min-h-[54px] grid-cols-1 sm:grid-cols-3 gap-2">
                  {items.map((product) => {
                    const status = statusCopy(product);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragged(product.id)}
                        onClick={() => setSelected(product)}
                        className={`group flex min-w-0 items-center gap-2 rounded-xl border p-2 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
                          dragged === product.id
                            ? "scale-95 opacity-50 border-[#68ef3f]"
                            : "border-[#d9deca] dark:border-[#273f2b] bg-white dark:bg-[#1c331f]"
                        }`}
                      >
                        <span className="text-xl transition-transform group-hover:scale-110">{product.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-[#122314] dark:text-white">
                            {product.name}
                          </span>
                          <span className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#b7bda5] dark:border-[#273f2b] bg-[#e7f9dd]/80 dark:bg-[#1c3520] p-3 animate-in fade-in">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-2xl">{selected.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#122314] dark:text-white">{selected.name}</p>
                <p className="text-xs text-[#5c6351] dark:text-[#b7bda5]">
                  {selected.quantity} · vence {selected.expiry}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onConsume(selected);
                setSelected(null);
              }}
              className="tomorro-btn-primary min-h-[38px] text-xs px-3.5"
            >
              <Check size={14} /> Consumido
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Quick Action Radar */}
      <div className="tomorro-card-bone flex flex-col justify-between p-5 sm:p-7 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6351] dark:text-[#b7bda5]">
                <Utensils size={15} className="text-[#26a200] dark:text-[#68ef3f]" /> Acciones recomendadas
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#122314] dark:text-white">
                Próximo paso
              </h3>
            </div>
            <div className="flex rounded-full border border-[#d9deca] dark:border-[#273f2b] bg-white dark:bg-[#122314] p-1">
              <button
                type="button"
                aria-label="Vista grilla"
                onClick={() => setView("grid")}
                className={`rounded-full p-2 transition ${
                  view === "grid"
                    ? "bg-[#68ef3f] text-[#30322a]"
                    : "text-[#5c6351] dark:text-[#b7bda5] hover:text-[#122314]"
                }`}
              >
                <Grid2X2 size={15} />
              </button>
              <button
                type="button"
                aria-label="Vista lista"
                onClick={() => setView("list")}
                className={`rounded-full p-2 transition ${
                  view === "list"
                    ? "bg-[#68ef3f] text-[#30322a]"
                    : "text-[#5c6351] dark:text-[#b7bda5] hover:text-[#122314]"
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>

          <div className={`mt-5 grid gap-2.5 ${view === "grid" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            {products
              .filter((p) => p.status !== "ok")
              .slice(0, 4)
              .map((product) => {
                const status = statusCopy(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelected(product)}
                    className="group flex items-center gap-3 rounded-2xl border border-[#d9deca] dark:border-[#273f2b] bg-white dark:bg-[#1c331f] p-3 text-left transition duration-150 hover:-translate-y-0.5 hover:border-[#68ef3f] hover:shadow-xs"
                  >
                    <span className="text-2xl">{product.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[#122314] dark:text-white">
                        {product.name}
                      </span>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                        {status.label}
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-[#7e8371] transition group-hover:translate-x-1" />
                  </button>
                );
              })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#d9deca] dark:border-[#273f2b] bg-[#f8faf5] dark:bg-[#122314] p-4">
          <p className="text-xs font-bold text-[#122314] dark:text-white">Consejo botánico del día</p>
          <p className="mt-1 text-xs leading-5 text-[#5c6351] dark:text-[#b7bda5]">
            Consumí primero lo que está por vencer y combinalo en recetas sencillas antes de sumar nuevas compras al carrito.
          </p>
        </div>
      </div>
    </section>
  );
}

export default InteractiveExperience;
