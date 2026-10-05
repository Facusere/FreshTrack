import React from "react";
import { MoreHorizontal, PackageOpen } from "lucide-react";
import { Product, ProductStatus } from "@/types/product";
import { formatRelativeDays } from "@/lib/dates";
import { isQuantityLow } from "@/lib/quantity";
import { isFreshProduceCategory } from "@/lib/shelfLifeCatalog";

const statusCopy: Record<ProductStatus, { label: string; color: string; dot: string }> = {
  ok: {
    label: "En fecha",
    color: "text-emerald-800 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
  soon: {
    label: "Por vencer",
    color: "text-amber-800 bg-amber-50 border border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  expired: {
    label: "Vencido",
    color: "text-rose-800 bg-rose-50 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800/50",
    dot: "bg-rose-500",
  },
};

export function MiniStatus({ status }: { status: ProductStatus }) {
  const meta = statusCopy[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export interface ProductRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onOpen?: (product: Product) => void;
}

export function ProductRow({ product, onEdit, onOpen }: ProductRowProps) {
  const lowStock = isQuantityLow(product.quantity);
  const isOpenUrgent = product.state === "abierto" && product.days <= 2 && product.days >= 0;
  const alertTone =
    product.status === "expired"
      ? "border-l-4 border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20"
      : isOpenUrgent
      ? "border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20"
      : product.status === "soon"
      ? "border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20"
      : lowStock
      ? "border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
      : "";

  return (
    <div
      className={`group grid grid-cols-[minmax(0,1fr)_100px_90px_auto] items-center gap-3 border-b border-line/60 py-3.5 pl-3 pr-2 transition-all duration-150 hover:bg-emerald-50/40 dark:hover:bg-[#16241b] rounded-xl last:border-b-0 ${alertTone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface border border-line text-xl shadow-xs">
          {product.icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs sm:text-sm font-semibold text-content-heading">
              {product.name}
            </p>
            {product.state === "abierto" && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/50"
                title={product.openedAt ? `Abierto el ${product.openedAt}` : "Envase abierto"}
              >
                <PackageOpen size={11} /> Abierto
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-content-muted">
            {product.quantity} · {product.category}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isOpenUrgent && (
              <span className="inline-flex rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                Consumir ya
              </span>
            )}
            {product.status === "soon" && !isOpenUrgent && (
              <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                Vence pronto
              </span>
            )}
            {product.status === "expired" && (
              <span className="inline-flex rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                Revisar hoy
              </span>
            )}
            {product.status !== "expired" && lowStock && (
              <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Queda poco
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-left">
        <p className="text-xs font-semibold text-content-heading">{product.expiry}</p>
        <p className="mt-0.5 text-[11px] text-content-muted">
          {formatRelativeDays(product.days)}
        </p>
      </div>

      <MiniStatus status={product.status} />

      <div className="relative flex items-center justify-end gap-1">
        {onOpen && product.state === "cerrado" && !isFreshProduceCategory(product.category) && (
          <button
            type="button"
            aria-label={`Marcar como abierto ${product.name}`}
            title="Marcar como abierto"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(product);
            }}
            className="flex h-8 items-center gap-1 rounded-full border border-line bg-surface px-2.5 text-[11px] font-bold text-content hover:bg-brand-subtle hover:text-brand-text transition opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <PackageOpen size={13} />
            <span className="hidden lg:inline">Abrir</span>
          </button>
        )}
        <button
          aria-label={`Acciones para ${product.name}`}
          onClick={() => onEdit(product)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-content-muted hover:text-content hover:bg-brand-subtle opacity-90 transition sm:opacity-0 sm:group-hover:opacity-100"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

export default ProductRow;
