import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  isQuantityLow,
  parseQuantity,
} from "../lib/quantity";
import {
  matchIngredientTokens,
  findBestMatchingItem,
} from "../lib/ingredientMatching";
import {
  planRecipeConsumption,
  applyConsumptionPlan,
  undoConsumptionHistory,
  ConsumptionRecord,
} from "../lib/inventoryConsumption";
import { StoredProduct } from "../types/product";

describe("quantity.ts - Unit Parsing, Formatting, and Low-Stock Detection", () => {
  it("parses mass, volume, count, pack, fractions, decimals, and docenas", () => {
    expect(parseQuantity("500 g")).toEqual({ amount: 500, unit: "g", family: "mass" });
    expect(parseQuantity("1,5 kg")).toEqual({ amount: 1.5, unit: "kg", family: "mass" });
    expect(parseQuantity("2 litros")).toEqual({ amount: 2, unit: "litros", family: "volume" });
    expect(parseQuantity("1 taza")).toEqual({ amount: 1, unit: "taza", family: "volume" });
    expect(parseQuantity("1/2 taza")).toEqual({ amount: 0.5, unit: "taza", family: "volume" });
    expect(parseQuantity("1 1/2 kg")).toEqual({ amount: 1.5, unit: "kg", family: "mass" });
    expect(parseQuantity("½ litro")).toEqual({ amount: 0.5, unit: "litros", family: "volume" });
    expect(parseQuantity("4 unidades")).toEqual({ amount: 4, unit: "unidades", family: "count" });
    expect(parseQuantity("1 docena")).toEqual({ amount: 12, unit: "unidades", family: "count" });
    expect(parseQuantity("1 paquete")).toEqual({ amount: 1, unit: "paquete", family: "pack" });
    expect(parseQuantity("sin numeros")).toBeNull();
  });

  it("formats quantities cleanly with unit conversions when dropping below 1 kg or 1 l", () => {
    expect(formatQuantity({ amount: 1, unit: "litro", family: "volume" })).toBe("1 litro");
    expect(formatQuantity({ amount: 2, unit: "litros", family: "volume" })).toBe("2 litros");
    expect(formatQuantity({ amount: 0.75, unit: "kg", family: "mass" })).toBe("750 g");
    expect(formatQuantity({ amount: 0.5, unit: "l", family: "volume" })).toBe("500 ml");
    expect(formatQuantity({ amount: 1.76, unit: "l", family: "volume" })).toBe("1,76 l");
    expect(formatQuantity({ amount: 1, unit: "unidad", family: "count" })).toBe("1 unidad");
    expect(formatQuantity({ amount: 3, unit: "unidades", family: "count" })).toBe("3 unidades");
  });

  it("isQuantityLow classifies low stock according to unified rules", () => {
    expect(isQuantityLow("1 kg")).toBe(false);
    expect(isQuantityLow("1,5 kg")).toBe(false);
    expect(isQuantityLow("2 litros")).toBe(false);
    expect(isQuantityLow("1 unidad")).toBe(true);
    expect(isQuantityLow("50 g")).toBe(true);
    expect(isQuantityLow("queda poco")).toBe(true);
    expect(isQuantityLow("último pote")).toBe(true);
    expect(isQuantityLow("1 paquete")).toBe(true);
    expect(isQuantityLow("2 paquetes")).toBe(false);
    expect(isQuantityLow("500 g")).toBe(false);
    expect(isQuantityLow("200 ml")).toBe(false);
  });
});

describe("ingredientMatching.ts - Token Matching & Edge Cases", () => {
  it("Pancetta does NOT consume Pan de molde", () => {
    const res = matchIngredientTokens("Pan de molde", "Pancetta");
    expect(res.score).toBe(0);
  });

  it("Papaya does NOT consume Papa", () => {
    const res = matchIngredientTokens("Papa", "Papaya");
    expect(res.score).toBe(0);
    const resPlural = matchIngredientTokens("Papas", "Papayas");
    expect(resPlural.score).toBe(0);
  });

  it("matches spinach ↔ Espinaca fresca through synonym and token recognition", () => {
    const res = matchIngredientTokens("Espinaca fresca", "spinach");
    expect(res.score).toBeGreaterThan(0);

    const resReverse = matchIngredientTokens("spinach", "Espinaca fresca");
    expect(resReverse.score).toBeGreaterThan(0);
  });

  it("resolves ties by choosing the item with earliest expiry (FEFO)", () => {
    const items: StoredProduct[] = [
      {
        id: 1,
        name: "Yogur natural",
        category: "Lácteos",
        expiryDate: "2026-09-28", // Later
        quantity: "2 unidades",
        icon: "🥣",
      },
      {
        id: 2,
        name: "Yogur natural",
        category: "Lácteos",
        expiryDate: "2026-09-22", // Earlier
        quantity: "2 unidades",
        icon: "🥣",
      },
    ];

    const match = findBestMatchingItem(items, { name: "Yogur" });
    expect(match?.id).toBe(2); // Earlier expiry wins
  });

  it("never consumes expired products", () => {
    const items: any[] = [
      {
        id: 1,
        name: "Leche entera",
        category: "Lácteos",
        expiryDate: "2026-09-10",
        quantity: "1 litro",
        icon: "🥛",
        status: "expired",
      },
    ];

    const match = findBestMatchingItem(items, { name: "Leche" });
    expect(match).toBeNull();
  });
});

describe("inventoryConsumption.ts - Consumption Planning & Execution", () => {
  it("calculates accurate mass deductions: Harina 500 g − 200 g = 300 g", () => {
    const pantry: StoredProduct[] = [
      {
        id: 10,
        name: "Harina",
        category: "Almacén seco",
        expiryDate: "2026-12-01",
        quantity: "500 g",
        icon: "🌾",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Harina", measure: "200 g" },
    ]);

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].deduct).toEqual({ amount: 200, unit: "g", family: "mass" });
    expect(plan.lines[0].remaining).toEqual({ amount: 300, unit: "g", family: "mass" });
    expect(plan.lines[0].willDeplete).toBe(false);

    const result = applyConsumptionPlan(pantry, [
      { itemId: 10, deductQuantityText: "200 g" },
    ]);

    expect(result.remaining[0].quantity).toBe("300 g");
  });

  it("calculates unit conversions: Arroz 1 kg − 250 g = 750 g", () => {
    const pantry: StoredProduct[] = [
      {
        id: 11,
        name: "Arroz largo fino",
        category: "Almacén seco",
        expiryDate: "2027-01-01",
        quantity: "1 kg",
        icon: "🍚",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Arroz", measure: "250 g" },
    ]);

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].confidence).toBe("converted");
    expect(plan.lines[0].remaining).toEqual({ amount: 0.75, unit: "kg", family: "mass" });

    const result = applyConsumptionPlan(pantry, [
      { itemId: 11, deductQuantityText: "250 g" },
    ]);

    // Sub-kilogram formatted as 750 g
    expect(result.remaining[0].quantity).toBe("750 g");
  });

  it("calculates volume conversions: Leche 2 litros − 1 taza = 1,76 l", () => {
    const pantry: StoredProduct[] = [
      {
        id: 12,
        name: "Leche entera",
        category: "Lácteos",
        expiryDate: "2026-09-30",
        quantity: "2 litros",
        icon: "🥛",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Leche", measure: "1 taza" }, // 1 taza = 240 ml = 0.24 litros
    ]);

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].confidence).toBe("converted");
    expect(plan.lines[0].remaining?.amount).toBeCloseTo(1.76, 2);

    const result = applyConsumptionPlan(pantry, [
      { itemId: 12, deductQuantityText: "240 ml" },
    ]);

    expect(result.remaining[0].quantity).toBe("1,76 l");
  });

  it("deducts count units: Yogur 4 unidades − 1 = 3 unidades", () => {
    const pantry: StoredProduct[] = [
      {
        id: 13,
        name: "Yogur natural",
        category: "Lácteos",
        expiryDate: "2026-10-05",
        quantity: "4 unidades",
        icon: "🥣",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Yogur", measure: "1 unidad" },
    ]);

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].deduct).toEqual({ amount: 1, unit: "unidad", family: "count" });
    expect(plan.lines[0].remaining).toEqual({ amount: 3, unit: "unidades", family: "count" });

    const result = applyConsumptionPlan(pantry, [
      { itemId: 13, deductQuantityText: "1 unidad" },
    ]);

    expect(result.remaining[0].quantity).toBe("3 unidades");
  });

  it("'a gusto' does not deduct and does not show as unmatched", () => {
    const pantry: StoredProduct[] = [
      {
        id: 14,
        name: "Sal fina",
        category: "Almacén seco",
        expiryDate: "2028-01-01",
        quantity: "500 g",
        icon: "🧂",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Sal fina", measure: "a gusto" },
      { name: "Pimienta", measure: "to taste" },
    ]);

    // Sal matched without deduction
    const salLine = plan.lines.find((l) => l.itemName === "Sal fina");
    expect(salLine).toBeDefined();
    expect(salLine?.deduct).toBeNull();

    // Pimienta not in pantry, but being a non-numeric spice it is omitted from unmatched
    expect(plan.unmatched).not.toContain("Pimienta");
  });

  it("leaves inconvertible measures as manual confidence without auto-deducting", () => {
    const pantry: StoredProduct[] = [
      {
        id: 15,
        name: "Harina",
        category: "Almacén seco",
        expiryDate: "2027-01-01",
        quantity: "1 paquete", // Pack family
        icon: "🌾",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Harina", measure: "200 g" }, // Mass family vs pack
    ]);

    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0].confidence).toBe("manual");
    expect(plan.lines[0].deduct).toBeNull();
  });

  it("depletes and removes product when remaining reaches 0", () => {
    const pantry: StoredProduct[] = [
      {
        id: 16,
        name: "Espinaca fresca",
        category: "Verduras frescas",
        expiryDate: "2026-09-25",
        quantity: "1 atado",
        icon: "🥬",
      },
    ];

    const plan = planRecipeConsumption(pantry, [
      { name: "Espinaca fresca", measure: "1 atado" },
    ]);

    expect(plan.lines[0].willDeplete).toBe(true);

    const result = applyConsumptionPlan(pantry, [
      { itemId: 16, deductQuantityText: "1 atado" },
    ]);

    expect(result.remaining).toHaveLength(0);
    expect(result.depletedItemNames).toContain("Espinaca fresca");
  });

  it("undoConsumption successfully restores prior inventory with subsequent consumptions", () => {
    const initialPantry: StoredProduct[] = [
      { id: 1, name: "Yogur", category: "Lácteos", expiryDate: "2026-09-30", quantity: "4 unidades", icon: "🥣" },
      { id: 2, name: "Manzanas", category: "Frutas", expiryDate: "2026-10-10", quantity: "6 unidades", icon: "🍎" },
    ];

    // Consumption 1: eats 1 Yogur (leaves 3)
    const afterFirst = applyConsumptionPlan(initialPantry, [{ itemId: 1, deductQuantityText: "1 unidad" }]);
    const rec1: ConsumptionRecord = {
      id: 101,
      title: "Desayuno",
      ingredients: ["Yogur"],
      before: initialPantry,
      applied: afterFirst.applied,
      delta: { kg: 0.4, money: 1200, meals: 1 },
      createdAt: "10:00",
    };

    // Consumption 2: eats 2 Manzanas (leaves 4)
    const afterSecond = applyConsumptionPlan(afterFirst.remaining, [{ itemId: 2, deductQuantityText: "2 unidades" }]);
    const rec2: ConsumptionRecord = {
      id: 102,
      title: "Merienda",
      ingredients: ["Manzanas"],
      before: afterFirst.remaining,
      applied: afterSecond.applied,
      delta: { kg: 0.4, money: 1200, meals: 1 },
      createdAt: "16:00",
    };

    const history = [rec1, rec2];

    // Undo Consumption 1 (Desayuno)
    const { rebuiltProducts, rebuiltHistory } = undoConsumptionHistory(history, 101);

    expect(rebuiltHistory).toHaveLength(1);
    expect(rebuiltHistory[0].id).toBe(102);

    // Rebuilt products should have restored Yogur to 4 unidades, while keeping Consumption 2 (Manzanas = 4)
    const yogur = rebuiltProducts.find((p) => p.id === 1);
    const manzanas = rebuiltProducts.find((p) => p.id === 2);

    expect(yogur?.quantity).toBe("4 unidades");
    expect(manzanas?.quantity).toBe("4 unidades");
  });
});
