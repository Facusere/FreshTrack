import React from "react";
import { MoreHorizontal, PackageOpen } from "lucide-react";
import { Product, ProductStatus } from "@/types/product";
import { formatRelativeDays } from "@/lib/dates";
import { isQuantityLow } from "@/lib/quantity";
import { isFreshProduceCategory } from "@/lib/shelfLifeCatalog";

const statusCopy: Record<ProductStatus, { label: string; color: string; dot: string }> = {
  ok: {
    label: "En fecha",
    color: "text-[#1c3e21] bg-[#e7f9dd] border border-[#b7bda5] dark:text-[#68ef3f] dark:bg-[#1c3520] dark:border-[#273f2b]",
    dot: "bg-[#26a200] dark:bg-[#68ef3f]",
  },
  soon: {
    label: "Por vencer",
    color: "text-[#7a4d0c] bg-[#fdf5e6] border border-[#edd9b4] dark:text-[#f5cf7d] dark:bg-[#2b2314] dark:border-[#44351a]",
    dot: "bg-[#d97706]",
  },
  expired: {
    label: "Vencido",
    color: "text-[#8e2b20] bg-[#fdf1ef] border border-[#f8c9c3] dark:text-[#f59c90] dark:bg-[#2e1816] dark:border-[#4a2420]",
    dot: "bg-[#dc2626]",
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
      ? "border-l-4 border-l-[#dc2626] bg-[#fdf1ef]/40 dark:bg-[#2e1816]/30"
      : isOpenUrgent
      ? "border-l-4 border-l-[#d97706] bg-[#fdf5e6]/40 dark:bg-[#2b2314]/30"
      : product.status === "soon"
      ? "border-l-4 border-l-[#d97706] bg-[#fdf5e6]/40 dark:bg-[#2b2314]/30"
      : lowStock
      ? "border-l-4 border-l-[#68ef3f] bg-[#e7f9dd]/30 dark:bg-[#1c3520]/20"
      : "";

  return (
    <div
      className={`group grid grid-cols-[minmax(0,1fr)_100px_90px_auto] items-center gap-3 border-b border-[#d9deca]/60 dark:border-[#273f2b] py-3.5 pl-3 pr-2 transition-all duration-150 hover:bg-[#f2f5eb]/80 dark:hover:bg-[#1a331e] rounded-xl last:border-b-0 ${alertTone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#122314] border border-[#d9deca]/60 dark:border-[#273f2b] text-xl">
          {product.icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs sm:text-sm font-semibold text-[#122314] dark:text-white">
              {product.name}
            </p>
            {product.state === "abierto" && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-[#edd9b4] bg-[#fdf5e6] px-1.5 py-0.5 text-[10px] font-bold text-[#7a4d0c] dark:bg-[#2b2314] dark:text-[#f5cf7d] dark:border-[#44351a]"
                title={product.openedAt ? `Abierto el ${product.openedAt}` : "Envase abierto"}
              >
                <PackageOpen size={11} /> Abierto
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#5c6351] dark:text-[#b7bda5]">
            {product.quantity} · {product.category}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {isOpenUrgent && (
              <span className="inline-flex rounded-full bg-[#f8e7c9] px-2 py-0.5 text-[10px] font-bold text-[#7a4d0c] dark:bg-[#3b301f] dark:text-[#f5cf7d]">
                Consumir ya
              </span>
            )}
            {product.status === "soon" && !isOpenUrgent && (
              <span className="inline-flex rounded-full bg-[#fdf5e6] border border-[#edd9b4] px-2 py-0.5 text-[10px] font-bold text-[#7a4d0c] dark:bg-[#2b2314] dark:text-[#f5cf7d] dark:border-[#44351a]">
                Vence pronto
              </span>
            )}
            {product.status === "expired" && (
              <span className="inline-flex rounded-full bg-[#fdf1ef] border border-[#f8c9c3] px-2 py-0.5 text-[10px] font-bold text-[#8e2b20] dark:bg-[#2e1816] dark:text-[#f59c90] dark:border-[#4a2420]">
                Revisar hoy
              </span>
            )}
            {product.status !== "expired" && lowStock && (
              <span className="inline-flex rounded-full bg-[#e7f9dd] border border-[#b7bda5] px-2 py-0.5 text-[10px] font-bold text-[#1c3e21] dark:bg-[#1c3520] dark:text-[#68ef3f]">
                Queda poco
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-left">
        <p className="text-xs font-semibold text-[#122314] dark:text-white">{product.expiry}</p>
        <p className="mt-0.5 text-[11px] text-[#5c6351] dark:text-[#b7bda5]">
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
            className="flex h-8 items-center gap-1 rounded-full border border-[#d9deca] dark:border-[#273f2b] bg-white dark:bg-[#122314] px-2.5 text-[11px] font-bold text-[#122314] dark:text-white hover:bg-[#e7f9dd] hover:text-[#1c3e21] dark:hover:bg-[#1c3520] dark:hover:text-[#68ef3f] transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <PackageOpen size={13} />
            <span className="hidden lg:inline">Abrir</span>
          </button>
        )}
        <button
          aria-label={`Acciones para ${product.name}`}
          onClick={() => onEdit(product)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#5c6351] hover:text-[#122314] dark:hover:text-white hover:bg-[#e7f9dd] dark:hover:bg-[#1c3520] opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

export default ProductRow;
