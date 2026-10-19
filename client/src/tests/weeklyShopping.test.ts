import { describe, expect, it } from "vitest";
import {
  calculateWeeklyShoppingIngredients,
  addWeeklyItemsToShoppingList,
  scaleMeasure,
  WeeklyShoppingPreviewItem,
} from "../lib/weeklyShopping";
import { LocalRecipe } from "../lib/localRecipesMatching";
import { PlannedMeal } from "../lib/mealPlan";
import { Product } from "@/types/product";
import { ShoppingItem } from "../lib/shoppingList";
import { addDaysISO } from "../lib/dates";

const MOCK_RECIPES: LocalRecipe[] = [
  {
    id: "receta-1",
    name: "Guiso de carne",
    category: "Guisos",
    ingredients: [
      { name: "carne picada", quantity: "500 g" },
      { name: "papas", quantity: "500 g" },
      { name: "sal", quantity: "a gusto" },
    ],
    instructions: [],
  },
  {
    id: "receta-2",
    name: "Pastel de papa",
    category: "Tartas",
    ingredients: [
      { name: "carne picada", quantity: "500 g" },
      { name: "papas", quantity: "1 kg" },
      { name: "pimienta", quantity: "1 pizca" },
    ],
    instructions: [],
  },
  {
    id: "receta-3",
    name: "Sopa especial",
    category: "Sopas",
    ingredients: [
      { name: "caldo", quantity: "1 litro" },
      { name: "fideos", quantity: "1 paquete" },
    ],
    instructions: [],
  },
];

describe("weeklyShopping - Generación y agregación de compras semanal", () => {
  it("escala medidas según factor de porciones", () => {
    expect(scaleMeasure("500 g", 2)).toBe("1000 g");
    expect(scaleMeasure("2 unidades", 0.5)).toBe("1 unidad");
    expect(scaleMeasure("1,5 kg", 2)).toBe("3 kg");
  });

  it("suma ingredientes con unidades convertibles e ignora especias a gusto", () => {
    // 2 comidas planificadas que usan papas:
    // Guiso: 500g (factor 1 para 2 porciones)
    // Pastel: 1 kg (factor 1 para 2 porciones)
    // Total esperado: 1,5 kg
    const meals: PlannedMeal[] = [
      { id: "m1", recipeId: "receta-1", date: "2026-10-05", slot: "almuerzo", portions: 2 },
      { id: "m2", recipeId: "receta-2", date: "2026-10-06", slot: "cena", portions: 2 },
    ];

    const results = calculateWeeklyShoppingIngredients(meals, MOCK_RECIPES, []);

    // 'sal a gusto' y 'pimienta 1 pizca' deben haber sido excluidas
    const sal = results.find((r) => r.name.toLowerCase().includes("sal"));
    const pimienta = results.find((r) => r.name.toLowerCase().includes("pimienta"));
    expect(sal).toBeUndefined();
    expect(pimienta).toBeUndefined();

    // Papas sumadas: 500g + 1 kg = 1,5 kg
    const papas = results.find((r) => r.name.toLowerCase().includes("papa"));
    expect(papas).toBeDefined();
    expect(papas?.quantity).toBe("1,5 kg");
    expect(papas?.recipeNames).toContain("Guiso de carne");
    expect(papas?.recipeNames).toContain("Pastel de papa");
  });

  it("resta existencias disponibles de la despensa", () => {
    const meals: PlannedMeal[] = [
      { id: "m1", recipeId: "receta-1", date: "2026-10-05", slot: "almuerzo", portions: 2 },
    ];

    // Receta pide 500g de carne picada y 500g de papas.
    // Despensa tiene 200g de carne picada no vencida.
    const pantry: Product[] = [
      {
        id: 1,
        name: "Carne picada",
        category: "Carnes",
        expiryDate: addDaysISO(10),
        quantity: "200 g",
        icon: "🥩",
        days: 10,
        status: "ok",
        expiry: "15 oct",
      },
    ];

    const results = calculateWeeklyShoppingIngredients(meals, MOCK_RECIPES, pantry);
    const carne = results.find((r) => r.name.toLowerCase().includes("carne"));
    expect(carne).toBeDefined();
    // 500g - 200g = 300g faltantes
    expect(carne?.quantity).toBe("300 g");
  });

  it("un producto vencido en despensa no se descuenta (se considera faltante a reponer)", () => {
    const meals: PlannedMeal[] = [
      { id: "m1", recipeId: "receta-1", date: "2026-10-05", slot: "almuerzo", portions: 2 },
    ];

    // Despensa tiene carne picada pero VENCIDA
    const pantryWithExpired: Product[] = [
      {
        id: 1,
        name: "Carne picada",
        category: "Carnes",
        expiryDate: "2026-09-01",
        quantity: "500 g",
        icon: "🥩",
        days: -34,
        status: "expired",
        expiry: "1 sep",
      },
    ];

    const results = calculateWeeklyShoppingIngredients(meals, MOCK_RECIPES, pantryWithExpired);
    const carne = results.find((r) => r.name.toLowerCase().includes("carne"));
    // Debe pedir los 500g completos porque lo que hay en despensa no sirve
    expect(carne?.quantity).toBe("500 g");
  });

  it("no descuenta dos veces el mismo producto de la despensa para recetas distintas", () => {
    // 2 recetas que piden 500g de carne picada cada una (total 1000g = 1 kg).
    // En despensa solo hay 600g.
    const meals: PlannedMeal[] = [
      { id: "m1", recipeId: "receta-1", date: "2026-10-05", slot: "almuerzo", portions: 2 },
      { id: "m2", recipeId: "receta-2", date: "2026-10-06", slot: "cena", portions: 2 },
    ];

    const pantry: Product[] = [
      {
        id: 1,
        name: "Carne picada",
        category: "Carnes",
        expiryDate: addDaysISO(15),
        quantity: "600 g",
        icon: "🥩",
        days: 15,
        status: "ok",
        expiry: "20 oct",
      },
    ];

    const results = calculateWeeklyShoppingIngredients(meals, MOCK_RECIPES, pantry);
    const carne = results.find((r) => r.name.toLowerCase().includes("carne"));

    // Total pedido 1000g - 600g = 400g
    expect(carne?.quantity).toBe("400 g");
  });

  it("agrega los ítems seleccionados a la lista de compras combinando sin duplicados", () => {
    const existingList: ShoppingItem[] = [];

    const previewItems: WeeklyShoppingPreviewItem[] = [
      {
        id: "p1",
        name: "Papas",
        category: "Verduras",
        quantity: "1,5 kg",
        recipeNames: ["Guiso de carne", "Pastel de papa"],
        checked: true,
      },
    ];

    const updated = addWeeklyItemsToShoppingList(existingList, previewItems);
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("Papas");
    expect(updated[0].quantity).toBe("1,5 kg");
    expect(updated[0].recipeNames).toEqual(["Guiso de carne", "Pastel de papa"]);
  });
});
