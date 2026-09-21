import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ConsumptionPlan,
  ConsumptionPlanLine,
  SelectedDeduction,
} from "@/lib/inventoryConsumption";
import { formatQuantity, parseQuantity, convertQuantity } from "@/lib/quantity";
import { Check, AlertCircle, Utensils } from "lucide-react";

type LineState = {
  selected: boolean;
  deductText: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  recipeTitle: string;
  plan: ConsumptionPlan;
  onConfirm: (selected: SelectedDeduction[]) => void;
};

export function ConsumptionConfirmDialog({
  isOpen,
  onClose,
  recipeTitle,
  plan,
  onConfirm,
}: Props) {
  const [lineStates, setLineStates] = useState<Record<number, LineState>>({});

  useEffect(() => {
    const initial: Record<number, LineState> = {};
    plan.lines.forEach((line) => {
      const isAutoDeductible = line.deduct !== null && line.confidence !== "manual";
      initial[line.itemId] = {
        selected: isAutoDeductible,
        deductText: line.deduct ? formatQuantity(line.deduct) : "",
      };
    });
    setLineStates(initial);
  }, [plan]);

  const handleToggle = (itemId: number) => {
    setLineStates((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: { ...current, selected: !current.selected },
      };
    });
  };

  const handleTextChange = (itemId: number, text: string) => {
    setLineStates((prev) => {
      const current = prev[itemId] || { selected: true, deductText: "" };
      return {
        ...prev,
        [itemId]: {
          selected: text.trim().length > 0 ? true : current.selected,
          deductText: text,
        },
      };
    });
  };

  const handleConfirm = () => {
    const selectedDeductions: SelectedDeduction[] = [];
    plan.lines.forEach((line) => {
      const state = lineStates[line.itemId];
      if (state && state.selected && state.deductText.trim()) {
        selectedDeductions.push({
          itemId: line.itemId,
          deductQuantityText: state.deductText.trim(),
        });
      }
    });

    onConfirm(selectedDeductions);
    onClose();
  };

  // Determine if a line's current deduction will deplete the item
  const checkWillDeplete = (line: ConsumptionPlanLine, deductText: string) => {
    if (!deductText) return false;
    const reqQ = parseQuantity(deductText);
    const itemQ = parseQuantity(line.itemQuantityText);
    if (!reqQ || !itemQ) return false;

    if (reqQ.family === itemQ.family) {
      const convertedReq = convertQuantity(reqQ, itemQ.unit);
      if (convertedReq) {
        return itemQ.amount - convertedReq.amount <= 0.001;
      }
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px] p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#3c7350]">
            <Utensils size={18} />
            <DialogTitle>Descontar ingredientes</DialogTitle>
          </div>
          <DialogDescription>
            Revisá qué ingredientes vas a descontar de tu despensa para{" "}
            <span className="font-semibold text-[#1c332b]">“{recipeTitle}”</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {plan.lines.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#78907d]">
              No encontramos ingredientes coincidentes en tu despensa para descontar.
            </p>
          ) : (
            plan.lines.map((line) => {
              const state = lineStates[line.itemId] || {
                selected: false,
                deductText: "",
              };
              const willDeplete = checkWillDeplete(line, state.deductText);

              return (
                <div
                  key={line.itemId}
                  className={`rounded-2xl border p-3 transition ${
                    state.selected
                      ? "border-[#bad6bd] bg-[#f7fbf6]"
                      : "border-[#e6e4dc] bg-[#faf9f5] opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`line-${line.itemId}`}
                      checked={state.selected}
                      onChange={() => handleToggle(line.itemId)}
                      className="mt-1 h-4 w-4 rounded border-[#bad6bd] text-[#2c6448] focus:ring-[#8eb89a]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label
                          htmlFor={`line-${line.itemId}`}
                          className="cursor-pointer text-xs font-bold text-[#1f493a]"
                        >
                          {line.itemName}
                        </label>
                        <span className="text-[11px] text-[#78907d]">
                          Tenés: {line.itemQuantityText}
                        </span>
                      </div>

                      <p className="mt-0.5 text-[11px] text-[#8e988f]">
                        Receta pide: {line.ingredientName}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-[#4f6b57]">
                          <span>Descontar:</span>
                          <input
                            type="text"
                            value={state.deductText}
                            onChange={(e) =>
                              handleTextChange(line.itemId, e.target.value)
                            }
                            placeholder="Ej. 200 g"
                            disabled={!state.selected}
                            className="w-28 rounded-lg border border-[#d6e3d4] bg-white px-2 py-1 text-xs font-semibold text-[#1c332b] outline-none disabled:bg-[#f2efe9]"
                          />
                        </label>

                        {willDeplete && state.selected && (
                          <span className="rounded-full bg-[#f9e5df] px-2 py-0.5 text-[10px] font-bold text-[#a94c3c]">
                            Se termina
                          </span>
                        )}

                        {line.confidence === "manual" && !state.selected && (
                          <span className="text-[11px] italic text-[#a67425]">
                            Indicá cuánto usaste
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {plan.unmatched.length > 0 && (
            <div className="rounded-xl border border-[#ecd9b8] bg-[#fbf5ea] p-2.5 text-[11px] text-[#765a35]">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle size={13} />
                <span>No están en tu despensa (no se descuentan):</span>
              </div>
              <p className="mt-1 text-[#8b6f4e]">{plan.unmatched.join(", ")}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#dfe3db] px-4 py-2.5 text-xs font-semibold text-[#657268] hover:bg-[#f6f3ed]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1f493a] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#16392c]"
          >
            <Check size={14} /> Confirmar y descontar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
