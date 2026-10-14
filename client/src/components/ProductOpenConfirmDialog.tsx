import { AlertTriangle, PackageOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/types/product";
import { calculateOpenProduct } from "@/lib/shelfLifeCatalog";

export interface ProductOpenConfirmDialogProps {
  product: Product | null;
  today: Date;
  onClose: () => void;
  onConfirm: (product: Product) => void;
}

export function ProductOpenConfirmDialog({
  product,
  today,
  onClose,
  onConfirm,
}: ProductOpenConfirmDialogProps) {
  if (!product) return null;

  const calc = calculateOpenProduct(product, today);

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[400px] p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="text-amber-600 dark:text-amber-400" size={20} />
            ¿Marcar como abierto?
          </DialogTitle>
          <DialogDescription className="text-xs">
            {product.name} · {product.category}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 rounded-xl border border-line bg-surface-subtle p-3.5 space-y-2">
          <p className="text-sm font-semibold text-content-heading">
            Al abrirlo, vence en{" "}
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {calc.newDays} {calc.newDays === 1 ? "día" : "días"}
            </span>{" "}
            en vez de {calc.previousDays} {calc.previousDays === 1 ? "día" : "días"}.
          </p>
          <p className="text-xs text-content-muted">
            Nueva fecha: <span className="font-semibold text-content-body">{calc.newExpiryDate}</span>
          </p>

          {calc.warningNotice && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>{calc.warningNotice}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-content-body hover:bg-surface-elevated"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(product);
              onClose();
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
          >
            Confirmar y abrir
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
