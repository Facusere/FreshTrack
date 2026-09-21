import { StoredProduct } from "@/types/product";
import { findBestMatchingItem } from "./ingredientMatching";
import {
  convertQuantity,
  formatQuantity,
  parseQuantity,
  Quantity,
} from "./quantity";

export type ConsumptionConfidence = "exact" | "converted" | "assumed" | "manual";

export type ConsumptionPlanLine = {
  itemId: number;
  itemName: string;
  ingredientName: string;
  itemQuantityText: string;
  deduct: Quantity | null;
  remaining: Quantity | null;
  confidence: ConsumptionConfidence;
  willDeplete: boolean;
};

export type ConsumptionPlan = {
  lines: ConsumptionPlanLine[];
  unmatched: string[];
};

export type AppliedDeduction = {
  itemId: number;
  deducted: string;
};

export type ConsumptionRecord = {
  id: number;
  title: string;
  ingredients: string[];
  before: StoredProduct[];
  applied: AppliedDeduction[];
  delta: { kg: number; money: number; meals: number };
  createdAt: string;
};

const NON_NUMERIC_MEASURES =
  /\b(?:a gusto|al gusto|to taste|pinch|dash|pizca|pizcas|puñado|puñados)\b/i;

export function isNonNumericSpice(measure: string): boolean {
  if (!measure) return true;
  return NON_NUMERIC_MEASURES.test(measure.trim());
}

/**
 * Plans recipe ingredient consumption based on unit conversions, families, and FEFO matching.
 */
export function planRecipeConsumption(
  items: StoredProduct[],
  recipeIngredients: Array<{ name: string; nameOriginal?: string; measure: string }>
): ConsumptionPlan {
  const lines: ConsumptionPlanLine[] = [];
  const unmatched: string[] = [];

  // Track simulated items remaining during the plan calculation
  const workingItems = new Map<number, StoredProduct>(
    items.map((it) => [it.id, { ...it }])
  );

  for (const ingredient of recipeIngredients) {
    const rawMeasure = ingredient.measure ? ingredient.measure.trim() : "";
    const isSpice = isNonNumericSpice(rawMeasure);

    // Find best match in current working items (excluding expired)
    const availableItems = Array.from(workingItems.values());
    const matched = findBestMatchingItem(availableItems, ingredient);

    if (!matched) {
      // Non-numeric spices (e.g. "sal a gusto") are not reported as missing
      if (!isSpice) {
        unmatched.push(ingredient.name);
      }
      continue;
    }

    if (isSpice) {
      // Non-numeric seasonings match but produce 0 deduction and no missing warning
      lines.push({
        itemId: matched.id,
        itemName: matched.name,
        ingredientName: ingredient.name,
        itemQuantityText: matched.quantity,
        deduct: null,
        remaining: parseQuantity(matched.quantity),
        confidence: "assumed",
        willDeplete: false,
      });
      continue;
    }

    const itemQ = parseQuantity(matched.quantity);
    const reqQ = parseQuantity(rawMeasure);

    if (!itemQ || !reqQ) {
      // Cannot parse quantity automatically
      lines.push({
        itemId: matched.id,
        itemName: matched.name,
        ingredientName: ingredient.name,
        itemQuantityText: matched.quantity,
        deduct: null,
        remaining: itemQ,
        confidence: "manual",
        willDeplete: false,
      });
      continue;
    }

    // Try calculating deduction within same family
    let deductQ: Quantity | null = null;
    let remainingQ: Quantity | null = null;
    let confidence: ConsumptionConfidence = "manual";

    if (itemQ.family === reqQ.family) {
      if (itemQ.family === "mass") {
        // Mass: convert request to grams and item to grams
        const convertedReq = convertQuantity(reqQ, itemQ.unit);
        if (convertedReq) {
          const deductAmt = Math.min(itemQ.amount, convertedReq.amount);
          const remainingAmt = Math.max(0, itemQ.amount - convertedReq.amount);

          deductQ = { amount: deductAmt, unit: itemQ.unit, family: "mass" };
          remainingQ = { amount: remainingAmt, unit: itemQ.unit, family: "mass" };
          confidence = reqQ.unit === itemQ.unit ? "exact" : "converted";
        }
      } else if (itemQ.family === "volume") {
        // Volume: convert to item unit (e.g. 1 taza (240ml) to liters)
        const convertedReq = convertQuantity(reqQ, itemQ.unit);
        if (convertedReq) {
          const deductAmt = Math.min(itemQ.amount, convertedReq.amount);
          const remainingAmt = Math.max(0, itemQ.amount - convertedReq.amount);

          deductQ = { amount: deductAmt, unit: itemQ.unit, family: "volume" };
          remainingQ = { amount: remainingAmt, unit: itemQ.unit, family: "volume" };
          confidence = reqQ.unit === itemQ.unit ? "exact" : "converted";
        }
      } else if (itemQ.family === "count") {
        const deductAmt = Math.min(itemQ.amount, reqQ.amount);
        const remainingAmt = Math.max(0, itemQ.amount - reqQ.amount);

        deductQ = {
          amount: deductAmt,
          unit: deductAmt === 1 ? "unidad" : "unidades",
          family: "count",
        };
        remainingQ = {
          amount: remainingAmt,
          unit: remainingAmt === 1 ? "unidad" : "unidades",
          family: "count",
        };
        confidence = "exact";
      } else if (itemQ.family === "pack") {
        if (itemQ.unit === reqQ.unit) {
          const deductAmt = Math.min(itemQ.amount, reqQ.amount);
          const remainingAmt = Math.max(0, itemQ.amount - reqQ.amount);

          deductQ = { amount: deductAmt, unit: itemQ.unit, family: "pack" };
          remainingQ = { amount: remainingAmt, unit: itemQ.unit, family: "pack" };
          confidence = "exact";
        }
      }
    }

    const willDeplete = remainingQ !== null && remainingQ.amount <= 0.001;

    // Update working item in case another recipe ingredient also uses this pantry item
    if (remainingQ && remainingQ.amount > 0.001) {
      workingItems.set(matched.id, {
        ...matched,
        quantity: formatQuantity(remainingQ),
      });
    } else if (willDeplete) {
      workingItems.delete(matched.id);
    }

    lines.push({
      itemId: matched.id,
      itemName: matched.name,
      ingredientName: ingredient.name,
      itemQuantityText: matched.quantity,
      deduct: deductQ,
      remaining: remainingQ,
      confidence,
      willDeplete,
    });
  }

  return { lines, unmatched };
}

export type SelectedDeduction = {
  itemId: number;
  deductQuantityText: string;
};

/**
 * Applies confirmed consumption deductions to the stored inventory.
 * Removes products whose remaining quantity reaches 0.
 */
export function applyConsumptionPlan(
  stored: StoredProduct[],
  selectedDeductions: SelectedDeduction[]
): {
  remaining: StoredProduct[];
  applied: AppliedDeduction[];
  depletedItemNames: string[];
} {
  const result: StoredProduct[] = [];
  const applied: AppliedDeduction[] = [];
  const depletedItemNames: string[] = [];

  const deductionMap = new Map<number, string>(
    selectedDeductions.map((d) => [d.itemId, d.deductQuantityText])
  );

  for (const item of stored) {
    const deductText = deductionMap.get(item.id);
    if (!deductText) {
      // Untouched item
      result.push(item);
      continue;
    }

    const deductQ = parseQuantity(deductText);
    const itemQ = parseQuantity(item.quantity);

    if (!deductQ || !itemQ) {
      // Fallback: remove item if invalid
      depletedItemNames.push(item.name);
      applied.push({ itemId: item.id, deducted: item.quantity });
      continue;
    }

    // Convert deduct to item's unit
    let convertedDeduct = deductQ;
    if (deductQ.family === itemQ.family && deductQ.unit !== itemQ.unit) {
      const conv = convertQuantity(deductQ, itemQ.unit);
      if (conv) convertedDeduct = conv;
    }

    const remainingAmount = itemQ.amount - convertedDeduct.amount;
    applied.push({ itemId: item.id, deducted: formatQuantity(convertedDeduct) });

    if (remainingAmount <= 0.001) {
      depletedItemNames.push(item.name);
    } else {
      const newQuantity: Quantity = {
        amount: remainingAmount,
        unit: itemQ.unit,
        family: itemQ.family,
      };
      result.push({
        ...item,
        quantity: formatQuantity(newQuantity),
      });
    }
  }

  return { remaining: result, applied, depletedItemNames };
}

/**
 * Reconstructs previous state when undoing a consumption record,
 * restoring the snapshot and reapplying later records by itemId.
 */
export function undoConsumptionHistory(
  records: ConsumptionRecord[],
  targetRecordId: number
): {
  rebuiltProducts: StoredProduct[];
  rebuiltHistory: ConsumptionRecord[];
} {
  const recordIndex = records.findIndex((r) => r.id === targetRecordId);
  if (recordIndex < 0) {
    return { rebuiltProducts: [], rebuiltHistory: records };
  }

  const target = records[recordIndex];
  const laterRecords = records.slice(recordIndex + 1);

  let currentProducts = target.before;

  // Re-apply subsequent consumptions using their recorded applied deductions
  const rebuiltLater: ConsumptionRecord[] = [];

  for (const record of laterRecords) {
    const beforeSnapshot = currentProducts;
    const deductions: SelectedDeduction[] = record.applied.map((a) => ({
      itemId: a.itemId,
      deductQuantityText: a.deducted,
    }));

    const outcome = applyConsumptionPlan(currentProducts, deductions);
    currentProducts = outcome.remaining;

    rebuiltLater.push({
      ...record,
      before: beforeSnapshot,
    });
  }

  const rebuiltHistory = [...records.slice(0, recordIndex), ...rebuiltLater];

  return {
    rebuiltProducts: currentProducts,
    rebuiltHistory,
  };
}

// ---------------------------------------------------------------------------
// Backward-compatible wrapper for existing consumers
// ---------------------------------------------------------------------------

export type InventoryItem = {
  id: number;
  name: string;
  quantity: string;
  expiryDate?: string;
  [key: string]: unknown;
};

export type ConsumptionResult<T extends InventoryItem> = {
  remaining: T[];
  consumed: string[];
  unmatched: string[];
};

export function consumeRecipeIngredients<T extends InventoryItem>(
  items: T[],
  ingredients: string[]
): ConsumptionResult<T> {
  const fakeStored: StoredProduct[] = items.map((it) => ({
    id: it.id,
    name: it.name,
    category: (it.category as string) || "General",
    expiryDate: (it.expiryDate as string) || "2099-12-31",
    quantity: it.quantity,
    icon: (it.icon as string) || "📦",
  }));

  const recipeIngredients = ingredients.map((text) => {
    const match = text.trim().match(/^([\d.,\/\s½⅓⅔¼¾]+[a-zA-Záéíóúñ]+)\s+(.*)$/);
    if (match) {
      return { measure: match[1], name: match[2] };
    }
    return { measure: "1", name: text.trim() };
  });

  const plan = planRecipeConsumption(fakeStored, recipeIngredients);
  const deductions: SelectedDeduction[] = plan.lines
    .filter((l) => l.deduct !== null)
    .map((l) => ({
      itemId: l.itemId,
      deductQuantityText: formatQuantity(l.deduct!),
    }));

  const appliedResult = applyConsumptionPlan(fakeStored, deductions);

  // Re-map back to generic type T
  const remainingIds = new Set(appliedResult.remaining.map((r) => r.id));
  const remainingUpdated = new Map(appliedResult.remaining.map((r) => [r.id, r.quantity]));

  const remainingGeneric: T[] = items
    .filter((it) => remainingIds.has(it.id))
    .map((it) => ({
      ...it,
      quantity: remainingUpdated.get(it.id) || it.quantity,
    }));

  const consumed = plan.lines.map((l) => l.itemName);

  return {
    remaining: remainingGeneric,
    consumed,
    unmatched: plan.unmatched,
  };
}
