import { Check, PackageOpen, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/types/product";
import { formatRelativeDays } from "@/lib/dates";
import { labelForDisplay } from "@/lib/dateRecognition";
import { isFreshProduceCategory } from "@/lib/shelfLifeCatalog";
import { inferLocation } from "@/lib/productHelpers";
import { MiniStatus } from "@/components/home/ProductRow";

export interface ProductDetailDialogProps {
  product: Product | null;
  onClose: () => void;
  onQuickConsume: (product: Product) => void;
  onMoveLocation: (product: Product, targetLocation: string) => void;
  onMarkOpen: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductDetailDialog({
  product,
  onClose,
  onQuickConsume,
  onMoveLocation,
  onMarkOpen,
  onEdit,
  onDelete,
}: ProductDetailDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[370px] p-5">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.category} · {product.quantity}</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 mt-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-2xl">
            {product.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-content-muted">
              Almacenado en {product.location || inferLocation(product.category)}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-surface-subtle p-3.5 border border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-content-muted">
              {labelForDisplay(product.dateLabel || "desconocida")}
            </span>
            <MiniStatus status={product.status} />
          </div>
          <p className="mt-2 text-lg font-semibold text-content-heading">{product.expiry}</p>
          <p className="mt-1 text-xs text-content-muted">{formatRelativeDays(product.days)}</p>
          {product.corrected && (
            <p className="mt-2 text-xs font-semibold text-brand-text">
              ✓ Corrección aplicada a futuras detecciones
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onQuickConsume(product);
            }}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Check size={15} strokeWidth={2.4} /> Consumir 1 unidad
          </button>

          {product.location !== "Freezer" ? (
            <button
              type="button"
              onClick={() => {
                onMoveLocation(product, "Freezer");
                onClose();
              }}
              className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content hover:bg-surface-muted"
            >
              🧊 Mover al Freezer (+90 días estimado)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onMoveLocation(product, "Heladera");
                onClose();
              }}
              className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content hover:bg-surface-muted"
            >
              ❄️ Pasar a Heladera
            </button>
          )}

          {product.state === "cerrado" && !isFreshProduceCategory(product.category) && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onMarkOpen(product);
              }}
              className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
            >
              <PackageOpen size={15} /> Marcar como abierto
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-content-body hover:bg-surface-elevated"
            >
              <Pencil size={14} /> Corregir
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(product);
              }}
              className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-status-expired-bg border border-status-expired-border px-3 py-2 text-xs font-bold text-status-expired-text hover:opacity-90"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
