import { afterEach, describe, expect, it } from "vitest";
import { consumeRecipeIngredients } from "../lib/inventoryConsumption";
import { recordImpact } from "../lib/impactStats";

const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

afterEach(() => storage.clear());

describe("inventory consumption integration", () => {
  it("decrements numeric quantities and removes single-unit products", () => {
    const inventory = [
      { id: 1, name: "Espinaca fresca", quantity: "2 atados" },
      { id: 2, name: "Tomates cherry", quantity: "1 bandeja" },
      { id: 3, name: "Leche entera", quantity: "2 litros" },
    ];
    const result = consumeRecipeIngredients(inventory, ["Espinaca fresca", "Tomates cherry"]);
    expect(result.consumed).toEqual(["Espinaca fresca", "Tomates cherry"]);
    expect(result.remaining).toEqual([
      { id: 1, name: "Espinaca fresca", quantity: "1 atados" },
      { id: 3, name: "Leche entera", quantity: "2 litros" },
    ]);
  });

  it("does not remove an ingredient that is not in the pantry", () => {
    const result = consumeRecipeIngredients([{ id: 1, name: "Papas", quantity: "3 unidades" }], ["Cebolla"]);
    expect(result.unmatched).toEqual(["Cebolla"]);
    expect(result.remaining).toHaveLength(1);
  });

  it("updates monthly impact after a successful pantry action", () => {
    Object.assign(globalThis, { localStorage: localStorageStub });
    const before = recordImpact({ kg: 0, money: 0, meals: 0 });
    const after = recordImpact({ kg: 0.4, money: 1200, meals: 1 });
    expect(after.actions).toBe(before.actions + 1);
    expect(after.kgSaved).toBe(Number((before.kgSaved + 0.4).toFixed(1)));
    expect(after.moneySaved).toBe(before.moneySaved + 1200);
    expect(after.mealsSaved).toBe(before.mealsSaved + 1);
  });
});
