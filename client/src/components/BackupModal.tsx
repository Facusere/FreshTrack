import React, { useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, HardDrive, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Product, StoredProduct } from "@/types/product";
import { exportBackupJSON, exportInventoryCSV, restoreBackupJSON } from "@/lib/backup";
import { playChimeSound, triggerHaptic } from "@/lib/feedback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  storedProducts: StoredProduct[];
  onRestoreSuccess: () => void;
}

export function BackupModal({
  isOpen,
  onClose,
  products,
  storedProducts,
  onRestoreSuccess,
}: BackupModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleExportJSON = () => {
    try {
      exportBackupJSON(storedProducts);
      playChimeSound("success");
      triggerHaptic();
      toast.success("Copia de seguridad descargada", {
        description: `Archivo JSON con ${storedProducts.length} alimentos guardados.`,
      });
    } catch {
      toast.error("No se pudo generar el archivo de respaldo.");
    }
  };

  const handleExportCSV = () => {
    try {
      exportInventoryCSV(products);
      playChimeSound("pop");
      triggerHaptic();
      toast.success("Inventario exportado a CSV", {
        description: "Compatible con Microsoft Excel y Google Sheets.",
      });
    } catch {
      toast.error("No se pudo exportar a CSV.");
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = restoreBackupJSON(content);
      setIsRestoring(false);

      if (res.success) {
        playChimeSound("success");
        triggerHaptic();
        toast.success("Restauración completada", {
          description: res.message,
        });
        onRestoreSuccess();
        onClose();
      } else {
        toast.error("Error al restaurar", {
          description: res.message,
        });
      }
    };
    reader.onerror = () => {
      setIsRestoring(false);
      toast.error("No se pudo leer el archivo seleccionado.");
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[480px] p-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-subtle text-brand">
              <HardDrive size={18} />
            </span>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-content-heading">
                Copia de Seguridad y Exportación
              </DialogTitle>
              <DialogDescription className="text-xs text-content-muted">
                Guardá tus alimentos en un archivo seguro o llevalos a Excel.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {/* Option 1: Complete Backup JSON */}
          <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between gap-3 transition hover:border-brand-border">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <FileText size={20} />
              </span>
              <div>
                <p className="text-xs font-bold text-content-heading">Copia completa (JSON)</p>
                <p className="text-[11px] text-content-muted">
                  Guarda inventario, historial de consumos y lista de compras.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="btn-3d shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-hover"
            >
              <Download size={13} /> Descargar
            </button>
          </div>

          {/* Option 2: Excel / CSV Export */}
          <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between gap-3 transition hover:border-brand-border">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                <FileSpreadsheet size={20} />
              </span>
              <div>
                <p className="text-xs font-bold text-content-heading">Exportar a Excel / CSV</p>
                <p className="text-[11px] text-content-muted">
                  Planilla con vencimientos, ubicaciones y cantidades.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content hover:bg-surface-muted transition"
            >
              <Download size={13} /> Exportar
            </button>
          </div>

          {/* Option 3: Restore Backup */}
          <div className="rounded-2xl border border-dashed border-brand-border bg-brand-subtle/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-brand-text">Restaurar copia de seguridad</p>
                <p className="text-[11px] text-content-muted">
                  Cargá un archivo .json previamente descargado para recuperar tus datos.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="btn-3d-accent shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-accent-lime px-3 py-2 text-xs font-bold text-accent-lime-fg disabled:opacity-50"
              >
                {isRestoring ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                Subir JSON
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-content hover:bg-surface-muted"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BackupModal;
