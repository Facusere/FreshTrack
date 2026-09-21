import { describe, expect, it } from "vitest";
import {
  calculateIngredientFrequencies,
  generateSmartSuggestions,
  migratePurchasedItemsToPantry,
  isQuantityLow,
  type ConsumptionHistoryEntry,
  type PantryItemReference,
  type ShoppingItem,
} from "../lib/shoppingList";

describe("shoppingList - Smart Suggestions & Restocking", () => {
  it("calculates ingredient frequencies correctly from consumption history", () => {
    const history: ConsumptionHistoryEntry[] = [
      { id: 1, title: "Tortilla", ingredients: ["Huevos", "Papa", "Cebolla"], createdAt: "2026-09-10" },
      { id: 2, title: "Omelette", ingredients: ["Huevos", "Queso cremoso"], createdAt: "2026-09-12" },
      { id: 3, title: "Revuelto", ingredients: ["Huevos", "Espinaca"], createdAt: "2026-09-15" },
    ];

    const freq = calculateIngredientFrequencies(history);
    expect(freq.get("huevos")?.count).toBe(3);
    expect(freq.get("papa")?.count).toBe(1);
    expect(freq.get("queso cremoso")?.count).toBe(1);
  });

  it("detects low quantities properly", () => {
    expect(isQuantityLow("1 unidad")).toBe(true);
    expect(isQuantityLow("1 kg")).toBe(true);
    expect(isQuantityLow("0.5 litros")).toBe(true);
    expect(isQuantityLow("1/2 kg")).toBe(true);
    expect(isQuantityLow("queda poco")).toBe(true);
    expect(isQuantityLow("3 unidades")).toBe(false);
    expect(isQuantityLow("2 litros")).toBe(false);
  });

  it("generates restock suggestions for frequently consumed ingredients not well stocked", () => {
    const history: ConsumptionHistoryEntry[] = [
      { id: 1, title: "Receta 1", ingredients: ["Leche entera", "Café molido"], createdAt: "2026-09-10" },
      { id: 2, title: "Receta 2", ingredients: ["Leche entera"], createdAt: "2026-09-14" },
    ];

    // Leche is in pantry but low stock (1 litro)
    const pantry: PantryItemReference[] = [
      { id: 10, name: "Leche entera", category: "Lácteos", quantity: "1 litro", expiryDate: "2026-09-22", icon: "🥛", days: 2, status: "soon", expiry: "22 sep" },
      { id: 11, name: "Arroz", category: "Almacén seco", quantity: "4 paquetes", expiryDate: "2027-01-01", icon: "🌾", days: 100, status: "ok", expiry: "1 ene 27" },
    ];

    const currentList: ShoppingItem[] = [];

    const suggestions = generateSmartSuggestions(pantry, history, currentList);

    // Leche entera should be suggested as frequent / low stock
    const lecheSug = suggestions.find((s) => s.name.toLowerCase().includes("leche"));
    expect(lecheSug).toBeDefined();
    expect(lecheSug?.reason).toBe("frecuente");

    // Café molido should also be suggested because it was consumed and is missing in pantry
    const cafeSug = suggestions.find((s) => s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("cafe"));
    expect(cafeSug).toBeDefined();

    // Arroz should NOT be suggested because it has 4 packages in pantry
    const arrozSug = suggestions.find((s) => s.name.toLowerCase().includes("arroz"));
    expect(arrozSug).toBeUndefined();
  });

  it("migrates completed shopping items into pantry products with estimated shelf life", () => {
    const mockIconFn = (name: string) => (name.toLowerCase().includes("leche") ? "🥛" : "📦");

    const list: ShoppingItem[] = [
      {
        id: "item-1",
        name: "Leche entera",
        category: "Lácteos",
        quantity: "2 litros",
        reason: "frecuente",
        completed: true,
        createdAt: "2026-09-18",
      },
      {
        id: "item-2",
        name: "Manzanas",
        category: "Frutas frescas",
        quantity: "1 kg",
        reason: "manual",
        completed: false,
        createdAt: "2026-09-18",
      },
    ];

    const result = migratePurchasedItemsToPantry(list, mockIconFn);

    expect(result.createdProducts).toHaveLength(1);
    expect(result.createdProducts[0].name).toBe("Leche entera");
    expect(result.createdProducts[0].quantity).toBe("2 litros");
    expect(result.createdProducts[0].icon).toBe("🥛");
    expect(result.createdProducts[0].estimated).toBe(true);
    expect(result.createdProducts[0].expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Remaining shopping list should only keep uncompleted items
    expect(result.remainingShoppingList).toHaveLength(1);
    expect(result.remainingShoppingList[0].name).toBe("Manzanas");
  });
});
