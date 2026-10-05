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
  onOpenProduct?: (product: Product) => void;
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
  onOpenProduct,
  onLoadDemoProducts,
  onNavigateToReports,
}: PantrySectionProps) {
  return (
    <section id="module-pantry" className="scroll-mt-24 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
      {/* Main Pantry List / Calendar */}
      <div className="tomorro-card-bone relative overflow-hidden p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-content-heading">
                {pantryView === "calendar" ? "Próxima semana" : "Por vencer esta semana"}
              </h2>
              <span className="tomorro-badge-sprout text-xs">
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
            <div className="flex items-center gap-1 rounded-full border border-line bg-surface-muted/80 p-1">
              <button
                type="button"
                onClick={() => setPantryView("list")}
                className={`min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  pantryView === "list"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-content-muted hover:text-content-heading"
                }`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setPantryView("calendar")}
                className={`flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  pantryView === "calendar"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-content-muted hover:text-content-heading"
                }`}
              >
                <CalendarDays size={13} /> Próxima semana
              </button>
            </div>
          )}
        </div>

        {storedProducts.length === 0 ? (
          <div className="py-12 text-center">
            <PackageOpen className="mx-auto text-content-muted" size={38} />
            <p className="mt-3 text-base font-bold text-content-heading">Tu despensa está vacía</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-content-muted">
              Escaneá un ticket de supermercado o agregá productos manualmente para empezar a controlar vencimientos.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenScan}
                className="tomorro-btn-primary min-h-[44px] text-xs font-semibold"
              >
                <ScanLine size={15} /> Escanear compra
              </button>
              <button
                type="button"
                onClick={onOpenAdd}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-content hover:bg-surface-muted transition"
              >
                <Plus size={15} /> Agregar manual
              </button>
            </div>
            <button
              type="button"
              onClick={onLoadDemoProducts}
              className="mt-4 min-h-[44px] text-xs font-semibold text-brand hover:underline transition"
            >
              Cargar datos de ejemplo
            </button>
          </div>
        ) : pantryView === "calendar" ? (
          <WeekCalendar products={products} />
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              {/* Search bar inside 24px radius input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted" />
                <input
                  type="text"
                  placeholder="Buscar en despensa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[24px] border border-line bg-surface py-2 pl-9 pr-3.5 text-xs text-content-heading outline-none focus:border-brand-focus focus:ring-1 focus:ring-brand-focus transition"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`shrink-0 min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    filter === "all"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-content-muted hover:bg-surface-muted"
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("soon")}
                  className={`shrink-0 min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    filter === "soon"
                      ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      : "text-content-muted hover:bg-surface-muted"
                  }`}
                >
                  Por vencer ({soonCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("expired")}
                  className={`shrink-0 min-h-[38px] rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    filter === "expired"
                      ? "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                      : "text-content-muted hover:bg-surface-muted"
                  }`}
                >
                  Vencidos ({expiredCount})
                </button>
              </div>

              {/* Advanced Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <SlidersHorizontal size={13} className="text-content-muted" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="min-h-[38px] rounded-[20px] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-content outline-none focus:ring-1 focus:ring-brand-focus"
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
                    className="min-h-[38px] rounded-[20px] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-content outline-none focus:ring-1 focus:ring-brand-focus"
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
                    className="min-h-[38px] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 divide-y divide-line/40">
              {(showAllPantry ? filteredProducts : filteredProducts.slice(0, 5)).map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={onEditProduct}
                  onOpen={onOpenProduct}
                />
              ))}
              {filteredProducts.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPantry((prev) => !prev)}
                  className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[24px] border border-line bg-surface py-2.5 text-xs font-bold text-content transition hover:bg-brand-subtle hover:text-brand-text"
                >
                  {showAllPantry
                    ? "Mostrar menos productos"
                    : `Mostrar todos los productos (${filteredProducts.length} en total)`}
                </button>
              )}
              {filteredProducts.length === 0 && (
                <div className="py-10 text-center">
                  <PackageOpen className="mx-auto text-content-muted" size={30} />
                  <p className="mt-2 text-sm font-semibold text-content-heading">
                    No encontramos alimentos con los filtros actuales
                  </p>
                  <p className="mt-1 text-xs text-content-muted">
                    Probá cambiar el filtro de estado o tu término de búsqueda.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* General Pantry Status Card */}
      <div className="tomorro-card-bone flex flex-col justify-between p-5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-content-heading">
                Estado general
              </h2>
              <p className="mt-1 text-xs text-content-muted">
                {okPercent >= 80
                  ? "Excelente control de despensa."
                  : "Tenés alimentos que requieren consumo prioritario."}
              </p>
            </div>
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                aria-label="Ver reportes"
                className="flex h-10 w-10 items-center justify-center rounded-full text-content-muted hover:text-content hover:bg-surface-muted transition"
              >
                <MoreHorizontal size={17} />
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center gap-6">
            <div
              className="relative flex h-[130px] w-[130px] shrink-0 items-center justify-center rounded-full shadow-inner"
              style={{
                background:
                  totalTracked > 0
                    ? `conic-gradient(#10b981 0 ${pOk}%, #f59e0b ${pOk}% ${pSoon}%, #f43f5e ${pSoon}% 100%)`
                    : "#10b981",
              }}
            >
              <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-surface border border-line/60 shadow-xs">
                <p className="font-display text-[26px] font-extrabold tracking-tight text-content-heading">
                  {okPercent}%
                </p>
                <p className="text-[10px] uppercase font-bold text-content-muted">En fecha</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["En fecha", okCount, "bg-emerald-500"],
                ["Por vencer", soonCount, "bg-amber-500"],
                ["Vencidos", expiredCount, "bg-rose-500"],
              ].map(([label, count, dotClass]) => (
                <div key={label as string} className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                  <div>
                    <p className="text-xs font-bold text-content-heading">{label}</p>
                    <p className="text-[11px] text-content-muted">{count} alimentos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 p-4 border border-emerald-200/60 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <Sparkles size={15} />
            <p className="text-xs font-bold">Consejo de FreshTrack</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-emerald-900/80 dark:text-emerald-200/70">
            Consumí primero lo que está por vencer para evitar que expire. El radar te sugiere recetas ideales.
          </p>
        </div>
      </div>
    </section>
  );
}

export default PantrySection;
