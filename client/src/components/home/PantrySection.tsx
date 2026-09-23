import React from "react";
import {
  ArrowUpDown,
  CalendarDays,
  MoreHorizontal,
  PackageOpen,
  Plus,
  ScanLine,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Product, ProductStatus, StoredProduct } from "@/types/product";
import { ALL_CATEGORIES } from "@/lib/categories";
import { ProductRow } from "./ProductRow";
import { WeekCalendar } from "./WeekCalendar";

export interface PantrySectionProps {
  products: Product[];
  storedProducts: StoredProduct[];
  filteredProducts: Product[];
  soonCount: number;
  expiredCount: number;
  okCount: number;
  okPercent: number;
  pOk: number;
  pSoon: number;
  totalTracked: number;
  pantryView: "list" | "calendar";
  setPantryView: (view: "list" | "calendar") => void;
  filter: "all" | ProductStatus;
  setFilter: (filter: "all" | ProductStatus) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  sortBy: "expiry-asc" | "expiry-desc" | "name-asc" | "name-desc" | "category";
  setSortBy: (sort: "expiry-asc" | "expiry-desc" | "name-asc" | "name-desc" | "category") => void;
  search: string;
  setSearch: (search: string) => void;
  showAllPantry: boolean;
  setShowAllPantry: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenScan: () => void;
  onOpenAdd: () => void;
  onEditProduct: (product: Product) => void;
  onLoadDemoProducts: () => void;
  onNavigateToReports?: () => void;
}

export function PantrySection({
  products,
  storedProducts,
  filteredProducts,
  soonCount,
  expiredCount,
  okCount,
  okPercent,
  pOk,
  pSoon,
  totalTracked,
  pantryView,
  setPantryView,
  filter,
  setFilter,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  search,
  setSearch,
  showAllPantry,
  setShowAllPantry,
  onOpenScan,
  onOpenAdd,
  onEditProduct,
  onLoadDemoProducts,
  onNavigateToReports,
}: PantrySectionProps) {
  return (
    <section id="module-pantry" className="scroll-mt-24 mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
      {/* Main Pantry List / Calendar */}
      <div className="card-3d relative overflow-hidden rounded-[24px] border border-line bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:px-5">
        {/* 3D Top Specular Light Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-content-heading">
                {pantryView === "calendar" ? "Próxima semana" : "Por vencer esta semana"}
              </h2>
              <span className="rounded-full bg-status-soon-bg px-2.5 py-0.5 text-xs font-bold text-status-soon-text border border-status-soon-border">
                {soonCount} por vencer
              </span>
            </div>
            <p className="mt-1 text-xs text-content-muted">
              {pantryView === "calendar"
                ? "Planificá tus comidas viendo qué vence cada día."
                : "Una mirada rápida para decidir qué consumir primero."}
            </p>
          </div>
          {storedProducts.length > 0 && (
            <div className="flex items-center gap-1 rounded-xl bg-surface-elevated p-1">
              <button
                type="button"
                onClick={() => setPantryView("list")}
                className={`min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  pantryView === "list" ? "bg-surface text-brand-text shadow-sm" : "text-content-muted"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setPantryView("calendar")}
                className={`flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  pantryView === "calendar" ? "bg-surface text-brand-text shadow-sm" : "text-content-muted"
                }`}
              >
                <CalendarDays size={12} /> Próxima semana
              </button>
            </div>
          )}
        </div>

        {storedProducts.length === 0 ? (
          <div className="py-12 text-center">
            <PackageOpen className="mx-auto text-content-muted" size={36} />
            <p className="mt-3 text-base font-semibold text-content-heading">Tu despensa está vacía</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-content-muted">
              Tu despensa está vacía. Escaneá un ticket o agregá productos para empezar a controlar vencimientos.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onOpenScan}
                className="btn-3d inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-hover"
              >
                <ScanLine size={15} /> Escanear compra
              </button>
              <button
                type="button"
                onClick={onOpenAdd}
                className="btn-3d inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-border bg-brand-subtle px-4 py-2.5 text-xs font-bold text-brand-text transition hover:bg-surface"
              >
                <Plus size={15} /> Agregar manual
              </button>
            </div>
            <button
              type="button"
              onClick={onLoadDemoProducts}
              className="mt-4 min-h-[44px] text-xs font-medium text-brand hover:underline transition"
            >
              Cargar datos de ejemplo
            </button>
          </div>
        ) : pantryView === "calendar" ? (
          <WeekCalendar products={products} />
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              {/* Search bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <input
                  type="text"
                  placeholder="Buscar en despensa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface py-2 pl-8 pr-3 text-xs text-content-body outline-none focus:border-brand-focus"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`shrink-0 min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filter === "all"
                      ? "bg-brand-subtle text-brand-text border border-brand-border"
                      : "text-content-muted hover:bg-surface-elevated"
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("soon")}
                  className={`shrink-0 min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filter === "soon"
                      ? "bg-status-soon-bg text-status-soon-text border border-status-soon-border"
                      : "text-content-muted hover:bg-surface-elevated"
                  }`}
                >
                  Por vencer ({soonCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("expired")}
                  className={`shrink-0 min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    filter === "expired"
                      ? "bg-status-expired-bg text-status-expired-text border border-status-expired-border"
                      : "text-content-muted hover:bg-surface-elevated"
                  }`}
                >
                  Vencidos ({expiredCount})
                </button>
              </div>

              {/* Advanced Filters: Category & Sorting */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <SlidersHorizontal size={13} className="text-content-muted" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="min-h-[44px] rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-semibold text-content-body outline-none focus:ring-2 focus:ring-brand-focus"
                    aria-label="Filtrar por categoría"
                  >
                    <option value="all">Todas las categorías</option>
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <ArrowUpDown size={13} className="text-content-muted" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="min-h-[44px] rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-semibold text-content-body outline-none focus:ring-2 focus:ring-brand-focus"
                    aria-label="Ordenar productos"
                  >
                    <option value="expiry-asc">Vencimiento: más próximo</option>
                    <option value="expiry-desc">Vencimiento: más lejano</option>
                    <option value="name-asc">Nombre: A → Z</option>
                    <option value="name-desc">Nombre: Z → A</option>
                    <option value="category">Categoría</option>
                  </select>
                </div>

                {(categoryFilter !== "all" || sortBy !== "expiry-asc") && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      setSortBy("expiry-asc");
                    }}
                    className="min-h-[44px] text-xs font-semibold text-status-expired-text hover:underline"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>

            <div className="mt-1">
              {(showAllPantry ? filteredProducts : filteredProducts.slice(0, 5)).map((product) => (
                <ProductRow key={product.id} product={product} onEdit={onEditProduct} />
              ))}
              {filteredProducts.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPantry((prev) => !prev)}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-muted py-2.5 text-xs font-bold text-brand-text transition hover:bg-surface"
                >
                  {showAllPantry
                    ? "Mostrar menos productos"
                    : `Mostrar todos los productos (${filteredProducts.length} en total)`}
                </button>
              )}
              {filteredProducts.length === 0 && (
                <div className="py-10 text-center">
                  <PackageOpen className="mx-auto text-content-muted" size={28} />
                  <p className="mt-2 text-sm font-semibold text-content-heading">
                    No encontramos productos con los filtros actuales
                  </p>
                  <p className="mt-1 text-xs text-content-muted">Probá cambiar el filtro o tu búsqueda.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* General Pantry Status Card */}
      <div className="card-3d relative overflow-hidden rounded-[24px] border border-line bg-surface p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)]">
        {/* 3D Top Specular Light Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.035em] text-content-heading">
              Estado general
            </h2>
            <p className="mt-1 text-xs text-content-muted">
              {okPercent >= 80
                ? "Tu despensa está bastante bien."
                : "Tenés productos que requieren consumo pronto."}
            </p>
          </div>
          {onNavigateToReports && (
            <button
              type="button"
              onClick={onNavigateToReports}
              aria-label="Ver reportes"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-content-muted hover:bg-surface-elevated"
            >
              <MoreHorizontal size={17} />
            </button>
          )}
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div
            className="relative flex h-[136px] w-[136px] shrink-0 items-center justify-center rounded-full"
            style={{
              background:
                totalTracked > 0
                  ? `conic-gradient(var(--status-ok-dot) 0 ${pOk}%, var(--status-soon-dot) ${pOk}% ${pSoon}%, var(--status-expired-dot) ${pSoon}% 100%)`
                  : "var(--status-ok-dot)",
            }}
          >
            <div className="flex h-[94px] w-[94px] flex-col items-center justify-center rounded-full bg-surface">
              <p className="text-[28px] font-semibold tracking-[-0.06em] text-brand-text">{okPercent}%</p>
              <p className="text-xs text-content-muted">en fecha</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              ["En fecha", okCount, "bg-status-ok-dot"],
              ["Por vencer", soonCount, "bg-status-soon-dot"],
              ["Vencidos", expiredCount, "bg-status-expired-dot"],
            ].map(([label, count, dotClass]) => (
              <div key={label as string} className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                <div>
                  <p className="text-xs font-semibold text-content-heading">{label}</p>
                  <p className="text-xs text-content-muted">{count} productos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-brand-subtle/50 p-3.5 border border-brand-border/40">
          <div className="flex items-center gap-2 text-brand-text">
            <Sparkles size={15} />
            <p className="text-xs font-bold">Tip de FreshTrack</p>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-content-body">
            Consumí primero lo que está en amarillo. Así evitás que llegue al rojo.
          </p>
        </div>
      </div>
    </section>
  );
}
