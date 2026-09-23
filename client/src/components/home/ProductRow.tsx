import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Product, ProductStatus } from "@/types/product";
import { formatRelativeDays } from "@/lib/dates";
import { isQuantityLow } from "@/lib/quantity";

const statusCopy: Record<ProductStatus, { label: string; color: string; dot: string }> = {
  ok: { label: "En fecha", color: "text-status-ok-text bg-status-ok-bg", dot: "bg-status-ok-dot" },
  soon: { label: "Por vencer", color: "text-status-soon-text bg-status-soon-bg", dot: "bg-status-soon-dot" },
  expired: { label: "Vencido", color: "text-status-expired-text bg-status-expired-bg", dot: "bg-status-expired-dot" },
};

export function MiniStatus({ status }: { status: ProductStatus }) {
  const meta = statusCopy[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export interface ProductRowProps {
  product: Product;
  onEdit: (product: Product) => void;
}

export function ProductRow({ product, onEdit }: ProductRowProps) {
  const lowStock = isQuantityLow(product.quantity);
  const alertTone =
    product.status === "expired"
      ? "border-l-4 border-l-status-expired-dot bg-status-expired-bg/30"
      : product.status === "soon"
      ? "border-l-4 border-l-status-soon-dot bg-status-soon-bg/30"
      : lowStock
      ? "border-l-4 border-l-brand-border bg-brand-subtle/30"
      : "";

  return (
    <div
      className={`group grid grid-cols-[minmax(0,1fr)_110px_92px_44px] items-center gap-3 border-b border-line/60 py-3.5 pl-2.5 pr-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-elevated/60 hover:shadow-xs rounded-xl last:border-b-0 ${alertTone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-xl">
          {product.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-content-heading">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-content-muted">
            {product.quantity} · {product.category}
          </p>
          {product.status === "soon" && (
            <span className="mt-1 inline-flex rounded-full bg-status-soon-bg px-2 py-0.5 text-xs font-bold text-status-soon-text">
              Vence pronto
            </span>
          )}
          {product.status === "expired" && (
            <span className="mt-1 inline-flex rounded-full bg-status-expired-bg px-2 py-0.5 text-xs font-bold text-status-expired-text">
              Revisar hoy
            </span>
          )}
          {product.status !== "expired" && lowStock && (
            <span className="mt-1 inline-flex rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-bold text-brand">
              Queda poco
            </span>
          )}
        </div>
      </div>
      <div className="text-left">
        <p className="text-xs font-semibold text-content-body">{product.expiry}</p>
        <p className="mt-0.5 text-xs text-content-muted">{formatRelativeDays(product.days)}</p>
      </div>
      <MiniStatus status={product.status} />
      <div className="relative flex justify-end">
        <button
          aria-label={`Acciones para ${product.name}`}
          onClick={() => onEdit(product)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-content-muted opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 hover:bg-surface-elevated hover:text-brand"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
