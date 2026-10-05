import React from "react";
import {
  ArrowUpDown,
  CalendarDays,
  Check,
  CheckSquare,
  MoreHorizontal,
  PackageOpen,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Trash2,
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
  locationFilter?: string;
  setLocationFilter?: (loc: string) => void;
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
  onQuickConsume?: (product: Product) => void;
  onLoadDemoProducts: () => void;
  onNavigateToReports?: () => void;
  // Batch actions
  selectedIds?: number[];
  onToggleSelectProduct?: (product: Product) => void;
  onSelectAllFiltered?: () => void;
  onClearSelection?: () => void;
  onBatchConsume?: () => void;
  onBatchAddToShoppingList?: () => void;
  onBatchMoveLocation?: (loc: string) => void;
  onBatchDelete?: () => void;
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
  locationFilter = "all",
  setLocationFilter,
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
  onQuickConsume,
  onLoadDemoProducts,
  onNavigateToReports,
  selectedIds = [],
  onToggleSelectProduct,
  onSelectAllFiltered,
  onClearSelection,
  onBatchConsume,
  onBatchAddToShoppingList,
  onBatchMoveLocation,
  onBatchDelete,
}: PantrySectionProps) {
  const isAllSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));

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
              Escaneá un ticket de supermercado, código de barras o agregá productos manualmente para empezar a controlar vencimientos.
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
            {/* Search, Status and Location Tabs */}
            <div className="mt-5 space-y-3 border-b border-line pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search bar */}
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
              </div>

              {/* Location Compartments Filter */}
              {setLocationFilter && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  {[
                    { id: "all", label: "Toda la cocina" },
                    { id: "heladera", label: "❄️ Heladera" },
                    { id: "freezer", label: "🧊 Freezer" },
                    { id: "alacena", label: "🥫 Alacena" },
                    { id: "cajon", label: "🥬 Cajón verduras" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLocationFilter(tab.id)}
                      className={`shrink-0 min-h-[32px] rounded-full px-3 py-1 text-xs font-semibold transition ${
                        locationFilter === tab.id
                          ? "bg-brand text-white shadow-xs font-bold"
                          : "text-content-muted hover:bg-surface-muted border border-line/60"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Advanced Category & Sorting Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal size={13} className="text-content-muted" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="min-h-[36px] rounded-[20px] border border-line bg-surface px-3 py-1 text-xs font-semibold text-content outline-none focus:ring-1 focus:ring-brand-focus"
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
                      className="min-h-[36px] rounded-[20px] border border-line bg-surface px-3 py-1 text-xs font-semibold text-content outline-none focus:ring-1 focus:ring-brand-focus"
                      aria-label="Ordenar productos"
                    >
                      <option value="expiry-asc">Vencimiento: más próximo</option>
                      <option value="expiry-desc">Vencimiento: más lejano</option>
                      <option value="name-asc">Nombre: A → Z</option>
                      <option value="name-desc">Nombre: Z → A</option>
                      <option value="category">Categoría</option>
                    </select>
                  </div>

                  {(categoryFilter !== "all" || sortBy !== "expiry-asc" || locationFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter("all");
                        setSortBy("expiry-asc");
                        setLocationFilter?.("all");
                      }}
                      className="min-h-[36px] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>

                {/* Batch selection quick button */}
                {onSelectAllFiltered && (
                  <button
                    type="button"
                    onClick={isAllSelected ? onClearSelection : onSelectAllFiltered}
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <CheckSquare size={13} />
                    {isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                )}
              </div>
            </div>

            {/* Products List */}
            <div className="mt-2 divide-y divide-line/40">
              {(showAllPantry ? filteredProducts : filteredProducts.slice(0, 7)).map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={onEditProduct}
                  onOpen={onOpenProduct}
                  onQuickConsume={onQuickConsume}
                  selected={selectedIds.includes(product.id)}
                  onToggleSelect={onToggleSelectProduct}
                  showCheckbox={selectedIds.length > 0}
                />
              ))}
              {filteredProducts.length > 7 && (
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
                    Probá cambiar el compartimento, estado o término de búsqueda.
                  </p>
                </div>
              )}
            </div>

            {/* Floating Batch Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="sticky bottom-3 z-30 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-surface/95 p-3 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
                    {selectedIds.length}
                  </span>
                  <span className="text-xs font-bold text-content-heading">seleccionados</span>
                  {onClearSelection && (
                    <button
                      type="button"
                      onClick={onClearSelection}
                      className="text-[11px] text-content-muted hover:underline ml-1"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {onBatchConsume && (
                    <button
                      type="button"
                      onClick={onBatchConsume}
                      className="btn-3d flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <Check size={14} strokeWidth={2.4} /> Consumir
                    </button>
                  )}
                  {onBatchAddToShoppingList && (
                    <button
                      type="button"
                      onClick={onBatchAddToShoppingList}
                      className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-content hover:bg-surface-muted"
                    >
                      <ShoppingCart size={13} /> Comprar
                    </button>
                  )}
                  {onBatchMoveLocation && (
                    <button
                      type="button"
                      onClick={() => onBatchMoveLocation("Freezer")}
                      className="flex min-h-[38px] items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-content hover:bg-surface-muted"
                      title="Mover a Freezer (extiende vencimiento)"
                    >
                      🧊 Al Freezer
                    </button>
                  )}
                  {onBatchDelete && (
                    <button
                      type="button"
                      onClick={onBatchDelete}
                      className="flex min-h-[38px] items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                      title="Eliminar seleccionados"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}
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
