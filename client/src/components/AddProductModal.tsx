import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product, StoredProduct } from "@/types/product";
import { ALL_CATEGORIES } from "@/lib/categories";
import { addDaysISO, daysUntil, todayISO } from "@/lib/dates";
import { DateLabel } from "@/lib/dateRecognition";
import {
  estimateShelfLife,
  ShelfLifeState,
  isFreshProduceCategory,
  FreshCondition,
} from "@/lib/shelfLifeCatalog";
import { detectProductIcon, inferLocation } from "@/lib/productHelpers";

export interface AddProductModalProps {
  onClose: () => void;
  onAdd: (product: StoredProduct) => void;
  initialProduct?: Product;
  onCorrection?: (product: Product, nextLabel: DateLabel, nextCategory: string, nextExpiryDate: string) => void;
  onSuggest?: (productName: string, category: string, state: ShelfLifeState, days: number) => void;
  today?: Date;
}

export function AddProductModal({
  onClose,
  onAdd,
  initialProduct,
  onCorrection,
  onSuggest,
  today = new Date(),
}: AddProductModalProps) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [category, setCategory] = useState(initialProduct?.category || "Almacén seco");
  const [location, setLocation] = useState(initialProduct?.location || inferLocation(initialProduct?.category || "Almacén seco"));
  const [isCustomLocation, setIsCustomLocation] = useState(Boolean(initialProduct?.location));
  const [quantity, setQuantity] = useState(initialProduct?.quantity || "1 unidad");
  const [expiryDate, setExpiryDate] = useState(() => initialProduct?.expiryDate || addDaysISO(7, today));
  const [isCustomExpiry, setIsCustomExpiry] = useState(false);
  const [dateLabel, setDateLabel] = useState<DateLabel>(initialProduct?.dateLabel || "vencimiento");
  const isProduce = isFreshProduceCategory(category);
  const [freshCondition, setFreshCondition] = useState<FreshCondition>("fresco");
  const [shelfState, setShelfState] = useState<ShelfLifeState>(initialProduct?.state || "cerrado");
  const [shelfDays, setShelfDays] = useState(() => {
    if (initialProduct?.expiryDate) {
      return Math.max(1, daysUntil(initialProduct.expiryDate, today));
    }
    return estimateShelfLife(initialProduct?.name || "", "cerrado", initialProduct?.category)?.days || 7;
  });
  const isEditing = Boolean(initialProduct);

  const shelfEstimate = useMemo(() => {
    return name.trim()
      ? estimateShelfLife(name, shelfState, category, isProduce ? freshCondition : undefined)
      : undefined;
  }, [name, shelfState, category, isProduce, freshCondition]);

  const handleNameChange = (val: string) => {
    setName(val);
    const estimate = estimateShelfLife(val, shelfState, category, isProduce ? freshCondition : undefined);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (!isCustomLocation) {
      setLocation(inferLocation(val));
    }
    const produce = isFreshProduceCategory(val);
    const estimate = estimateShelfLife(name, shelfState, val, produce ? freshCondition : undefined);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleFreshConditionChange = (val: FreshCondition) => {
    setFreshCondition(val);
    const estimate = estimateShelfLife(name, shelfState, category, val);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleShelfStateChange = (val: ShelfLifeState) => {
    setShelfState(val);
    const estimate = estimateShelfLife(name, val, category);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleShelfDaysChange = (days: number) => {
    const validDays = Number(days) || 1;
    setShelfDays(validDays);
    setExpiryDate(addDaysISO(validDays, today));
    setIsCustomExpiry(false);
  };

  const handleExpiryDateChange = (val: string) => {
    setExpiryDate(val);
    setIsCustomExpiry(true);
    const diff = daysUntil(val, today);
    setShelfDays(Math.max(1, diff));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (initialProduct && onCorrection) {
      onCorrection(initialProduct, dateLabel, category, expiryDate);
    } else {
      const finalState = isProduce ? "cerrado" : shelfState;
      const openedAt = (!isProduce && shelfState === "abierto") ? todayISO(today) : undefined;
      onAdd({
        id: Date.now(),
        name: name.trim(),
        category,
        expiryDate,
        quantity: quantity.trim() || "1 unidad",
        icon: detectProductIcon(name, category),
        dateLabel,
        location,
        state: finalState,
        openedAt,
      });
    }
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[480px] p-5">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Corregir producto" : "Agregar producto"}</DialogTitle>
          <DialogDescription>Una carga rápida, sin vueltas.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Producto</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Queso cremoso"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none transition placeholder:text-content-muted focus:border-brand-focus focus:ring-2 focus:ring-brand-subtle"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Categoría</span>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Ubicación</span>
              <select
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setIsCustomLocation(true);
                }}
                className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              >
                <option value="Heladera">❄️ Heladera</option>
                <option value="Freezer">🧊 Freezer</option>
                <option value="Alacena">🥫 Alacena</option>
                <option value="Cajón verduras">🥬 Cajón verduras</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Cantidad</span>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 2 unidades, 500g"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Fecha de vencimiento</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">¿Qué tipo de fecha es?</span>
              <select
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value as DateLabel)}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              >
                <option value="vencimiento">Fecha de vencimiento</option>
                <option value="elaboración">Fecha de elaboración</option>
                <option value="consumo preferente">Consumo preferente</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-line bg-brand-subtle/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-brand-text">Vida útil estimada</p>
                <p className="mt-0.5 text-xs text-content-body font-medium">
                  {shelfEstimate?.label || (
                    isProduce
                      ? (freshCondition === "pasado" ? "Calculado para producto maduro o ya pasado." : "Calculado para producto fresco recién comprado.")
                      : (shelfState === "abierto" ? "Calculado para envase abierto." : "Calculado según guías de conservación.")
                  )}
                </p>
              </div>
              {isProduce ? (
                <select
                  aria-label="Condición del producto"
                  value={freshCondition}
                  onChange={(e) => handleFreshConditionChange(e.target.value as FreshCondition)}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold text-brand-text"
                >
                  <option value="fresco">Recién comprado</option>
                  <option value="pasado">Ya un poco pasado</option>
                </select>
              ) : (
                <select
                  aria-label="Estado del envase"
                  value={shelfState}
                  onChange={(e) => handleShelfStateChange(e.target.value as ShelfLifeState)}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold text-brand-text"
                >
                  <option value="cerrado">Cerrado</option>
                  <option value="abierto">Abierto</option>
                </select>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="1"
                aria-label="Días estimados de vida útil"
                value={shelfDays}
                onChange={(e) => handleShelfDaysChange(Number(e.target.value))}
                className="w-20 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-semibold text-content-body outline-none focus:border-brand-focus"
              />
              <span className="text-xs text-content-body">días estimados</span>
              <button
                type="button"
                onClick={() => onSuggest?.(name, category, shelfState, shelfDays)}
                className="ml-auto min-h-[44px] rounded-lg bg-brand-subtle px-3 py-2 text-xs font-bold text-brand-text hover:bg-brand-border/40"
              >
                Recordar mi ajuste
              </button>
            </div>
          </div>
          {isEditing && (
            <p className="rounded-xl bg-brand-subtle/50 px-3 py-2 text-xs leading-4 text-brand-text">
              Tu corrección se guardará como regla para futuras lecturas de {name}.
            </p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-line px-4 py-3 text-xs font-semibold text-content-body transition duration-150 hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand-focus active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={handleSave}
            className="flex-1 min-h-[44px] rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white transition duration-150 hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEditing ? "Guardar corrección" : "Guardar producto"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
