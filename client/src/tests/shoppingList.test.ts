import { describe, expect, it } from "vitest";
import {
  calculateIngredientFrequencies,
  generateSmartSuggestions,
  migratePurchasedItemsToPantry,
  isQuantityLow,
  addLowStockToShoppingList,
  getItemReasonBadges,
  groupShoppingItemsByCategory,
  updateShoppingItemQuantity,
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
    expect(isQuantityLow("1 kg")).toBe(false);
    expect(isQuantityLow("1,5 kg")).toBe(false);
    expect(isQuantityLow("0.5 litros")).toBe(false); // 500 ml is not low
    expect(isQuantityLow("50 g")).toBe(true);
    expect(isQuantityLow("50 ml")).toBe(true);
    expect(isQuantityLow("queda poco")).toBe(true);
    expect(isQuantityLow("3 unidades")).toBe(false);
    expect(isQuantityLow("2 litros")).toBe(false);
  });

  it("generates restock suggestions for frequently consumed ingredients not well stocked", () => {
    const history: ConsumptionHistoryEntry[] = [
      { id: 1, title: "Receta 1", ingredients: ["Leche entera", "Café molido"], createdAt: "2026-09-10" },
      { id: 2, title: "Receta 2", ingredients: ["Leche entera"], createdAt: "2026-09-14" },
    ];

    // Leche is in pantry but low stock (50 ml)
    const pantry: PantryItemReference[] = [
      { id: 10, name: "Leche entera", category: "Lácteos", quantity: "50 ml", expiryDate: "2026-09-22", icon: "🥛", days: 2, status: "soon", expiry: "22 sep" },
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

  it("combinar ítem manual + por stock bajo del mismo producto no duplica y muestra ambos motivos", () => {
    // 1. Ítem agregado manualmente
    const initialList: ShoppingItem[] = [
      {
        id: "item-manual-1",
        name: "Leche entera",
        category: "Lácteos",
        quantity: "1 litro",
        reason: "manual",
        reasons: ["manual"],
        completed: false,
        createdAt: "2026-09-20",
      },
    ];

    // 2. Despensa con Leche con poco stock (isQuantityLow)
    const pantry: PantryItemReference[] = [
      {
        id: 101,
        name: "Leche descremada", // Sinónimo / token match con Leche
        category: "Lácteos",
        quantity: "50 ml",
        expiryDate: "2026-09-30",
        icon: "🥛",
        days: 1,
        status: "soon",
        expiry: "30 sep",
      },
    ];

    const updatedList = addLowStockToShoppingList(initialList, pantry as any);

    // No debe haber duplicado
    expect(updatedList).toHaveLength(1);
    const item = updatedList[0];
    expect(item.name.toLowerCase()).toContain("leche");

    // Debe contener ambos motivos
    expect(item.reasons).toContain("manual");
    expect(item.reasons).toContain("stock_bajo");

    // Las etiquetas deben indicar "Queda poco" (y nada si fuera solo manual)
    const badges = getItemReasonBadges(item);
    expect(badges).toContain("Queda poco");
  });

  it("marcar comprados y pasar a despensa solo mueve los tildados y les asigna estado cerrado", () => {
    const list: ShoppingItem[] = [
      {
        id: "i-1",
        name: "Yogur natural",
        category: "Lácteos",
        quantity: "2 potes",
        reason: "manual",
        reasons: ["manual"],
        completed: true,
        createdAt: "2026-09-25",
      },
      {
        id: "i-2",
        name: "Pan francés",
        category: "Panadería",
        quantity: "1 baguette",
        reason: "stock_bajo",
        reasons: ["stock_bajo"],
        completed: false,
        createdAt: "2026-09-25",
      },
      {
        id: "i-3",
        name: "Huevos",
        category: "Almacén seco",
        quantity: "6 unidades",
        reason: "manual",
        reasons: ["manual"],
        completed: true,
        createdAt: "2026-09-25",
      },
    ];

    const { createdProducts, remainingShoppingList } = migratePurchasedItemsToPantry(
      list,
      () => "🛒"
    );

    // Solo los 2 tildados deben pasar a la despensa
    expect(createdProducts).toHaveLength(2);
    expect(createdProducts.map((p) => p.name)).toEqual(["Yogur natural", "Huevos"]);
    expect(createdProducts[0].state).toBe("cerrado");
    expect(createdProducts[1].state).toBe("cerrado");

    // Solo el destildado debe permanecer en la lista de compras
    expect(remainingShoppingList).toHaveLength(1);
    expect(remainingShoppingList[0].name).toBe("Pan francés");
    expect(remainingShoppingList[0].completed).toBe(false);
  });

  it("agrupación por categoría ordena según el supermercado y no pierde ítems", () => {
    const list: ShoppingItem[] = [
      {
        id: "1",
        name: "Fideos",
        category: "Almacén seco",
        quantity: "1 paquete",
        reason: "manual",
        completed: false,
        createdAt: "2026-09-25",
      },
      {
        id: "2",
        name: "Tomates",
        category: "Verduras frescas",
        quantity: "1 kg",
        reason: "manual",
        completed: false,
        createdAt: "2026-09-25",
      },
      {
        id: "3",
        name: "Leche",
        category: "Lácteos",
        quantity: "1 litro",
        reason: "manual",
        completed: false,
        createdAt: "2026-09-25",
      },
    ];

    const groups = groupShoppingItemsByCategory(list);

    // Debe contener las 3 categorías
    expect(groups).toHaveLength(3);
    const categoryNames = groups.map((g) => g.category);
    expect(categoryNames).toContain("Almacén seco");
    expect(categoryNames).toContain("Verduras frescas");
    expect(categoryNames).toContain("Lácteos");

    // En ALL_CATEGORIES: "Almacén seco" viene antes de "Lácteos" o "Verduras frescas"
    const verduraGroup = groups.find((g) => g.category === "Verduras frescas");
    expect(verduraGroup?.items).toHaveLength(1);
    expect(verduraGroup?.items[0].name).toBe("Tomates");
  });

  it("actualiza cantidad validando con parseQuantity y rechaza formatos inválidos", () => {
    const list: ShoppingItem[] = [
      {
        id: "item-q-1",
        name: "Harina",
        category: "Almacén seco",
        quantity: "1 kg",
        reason: "manual",
        completed: false,
        createdAt: "2026-09-25",
      },
    ];

    // Texto no cuantificable
    const invalid = updateShoppingItemQuantity(list, "item-q-1", "texto cualquiera");
    expect(invalid).toBeNull();

    // Cantidad válida
    const valid = updateShoppingItemQuantity(list, "item-q-1", "750 g");
    expect(valid).not.toBeNull();
    expect(valid?.formatted).toBe("750 g");
    expect(valid?.updatedList[0].quantity).toBe("750 g");
  });
});
