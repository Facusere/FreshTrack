import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateLocalRecipeMatches,
  fetchOnlineRecipesForPantry,
  clearOnlineRecipeCache,
  LOCAL_RECIPES,
} from "../lib/localRecipesMatching";
import { Product } from "../types/product";
import { addDaysISO } from "../lib/dates";
import * as recipeApi from "../lib/recipeApi";

describe("Bloque C: Recetas según lo que tenés en la despensa (localRecipes)", () => {
  beforeEach(() => {
    clearOnlineRecipeCache();
    vi.restoreAllMocks();
  });

  it("el cálculo de match sobre localRecipes.json corre sin ningún mock de red (es puro)", () => {
    // Despensa con ingredientes no vencidos suficientes para fideos con manteca y queso
    const pantry: Product[] = [
      {
        id: 1,
        name: "Fideos secos",
        category: "Almacén seco",
        expiryDate: addDaysISO(60),
        quantity: "500 g",
        icon: "🍝",
        days: 60,
        status: "ok",
        expiry: "1 dic",
        state: "cerrado",
      },
      {
        id: 2,
        name: "Manteca",
        category: "Lácteos",
        expiryDate: addDaysISO(16),
        quantity: "200 g",
        icon: "🧈",
        days: 16,
        status: "ok",
        expiry: "15 oct",
        state: "cerrado",
      },
      {
        id: 3,
        name: "Queso sardo",
        category: "Lácteos",
        expiryDate: addDaysISO(21),
        quantity: "250 g",
        icon: "🧀",
        days: 21,
        status: "ok",
        expiry: "20 oct",
        state: "cerrado",
      },
      {
        id: 4,
        name: "Huevos",
        category: "Almacén seco",
        expiryDate: addDaysISO(11),
        quantity: "6 unidades",
        icon: "🥚",
        days: 11,
        status: "ok",
        expiry: "10 oct",
        state: "cerrado",
      },
    ];

    // Corremos el cálculo de manera 100% sincrónica y pura
    const result = calculateLocalRecipeMatches(pantry, LOCAL_RECIPES);

    expect(result).not.toBeNull();
    expect(result!.totalEligible).toBeGreaterThan(0);

    // Debe encontrar al menos una receta al 100% en "ready" (ej. Fideos con manteca y queso)
    const fideosManteca = result!.ready.find((r) =>
      r.recipe.name.toLowerCase().includes("fideos con manteca y queso")
    );
    expect(fideosManteca).toBeDefined();
    expect(fideosManteca?.matchRatio.percentage).toBe(100);
    expect(fideosManteca?.missingIngredients).toHaveLength(0);
  });

  it("'Podés hacer ahora' nunca incluye productos vencidos", () => {
    // Mismos ingredientes pero el Queso está VENCIDO
    const pantryWithExpired: Product[] = [
      {
        id: 1,
        name: "Fideos secos",
        category: "Almacén seco",
        expiryDate: addDaysISO(60),
        quantity: "500 g",
        icon: "🍝",
        days: 60,
        status: "ok",
        expiry: "1 dic",
        state: "cerrado",
      },
      {
        id: 2,
        name: "Manteca",
        category: "Lácteos",
        expiryDate: addDaysISO(16),
        quantity: "200 g",
        icon: "🧈",
        days: 16,
        status: "ok",
        expiry: "15 oct",
        state: "cerrado",
      },
      {
        id: 3,
        name: "Queso sardo",
        category: "Lácteos",
        expiryDate: addDaysISO(-10), // Vencido
        quantity: "250 g",
        icon: "🧀",
        days: -28,
        status: "expired",
        expiry: "1 sep",
        state: "cerrado",
      },
      {
        id: 4,
        name: "Huevos",
        category: "Almacén seco",
        expiryDate: addDaysISO(57),
        quantity: "6 unidades",
        icon: "🥚",
        days: 57,
        status: "ok",
        expiry: "10 dic",
        state: "cerrado",
      },
    ];

    const result = calculateLocalRecipeMatches(pantryWithExpired, LOCAL_RECIPES);
    expect(result).not.toBeNull();

    // "Fideos con manteca y queso" NO debe estar en "ready" porque el queso está vencido
    const fideosInReady = result!.ready.find((r) =>
      r.recipe.name.toLowerCase().includes("fideos con manteca y queso")
    );
    expect(fideosInReady).toBeUndefined();

    // Debe estar en "more" (2 de 3 = 67% < 80%) con queso como faltante
    const fideosInMore = result!.more.find((r) =>
      r.recipe.name.toLowerCase().includes("fideos con manteca y queso")
    );
    expect(fideosInMore).toBeDefined();
    expect(fideosInMore?.missingIngredients.some((m) => m.name.includes("queso"))).toBe(true);
  });

  it("retorna null si la despensa tiene menos de 3 productos aptos (estado vacío C6)", () => {
    const fewProducts: Product[] = [
      {
        id: 1,
        name: "Fideos secos",
        category: "Almacén seco",
        expiryDate: addDaysISO(60),
        quantity: "500 g",
        icon: "🍝",
        days: 60,
        status: "ok",
        expiry: "1 dic",
        state: "cerrado",
      },
      {
        id: 2,
        name: "Manteca",
        category: "Lácteos",
        expiryDate: addDaysISO(16),
        quantity: "200 g",
        icon: "🧈",
        days: 16,
        status: "ok",
        expiry: "15 oct",
        state: "cerrado",
      },
    ];

    const result = calculateLocalRecipeMatches(fewProducts, LOCAL_RECIPES);
    expect(result).toBeNull();
  });

  it("el botón online solo dispara fetch cuando se lo toca y cachea la búsqueda", async () => {
    const pantry: Product[] = [
      {
        id: 1,
        name: "Pollo",
        category: "Carnes",
        expiryDate: addDaysISO(6),
        quantity: "500 g",
        icon: "🍗",
        days: 6,
        status: "ok",
        expiry: "5 oct",
        state: "cerrado",
      },
      {
        id: 2,
        name: "Papas",
        category: "Verduras frescas",
        expiryDate: addDaysISO(16),
        quantity: "1 kg",
        icon: "🥔",
        days: 16,
        status: "ok",
        expiry: "15 oct",
        state: "cerrado",
      },
      {
        id: 3,
        name: "Cebollas",
        category: "Verduras frescas",
        expiryDate: addDaysISO(21),
        quantity: "1 kg",
        icon: "🧅",
        days: 21,
        status: "ok",
        expiry: "20 oct",
        state: "cerrado",
      },
    ];

    // Spy on searchRecipesByExpiring
    const searchSpy = vi.spyOn(recipeApi, "searchRecipesByExpiring").mockResolvedValue({
      recipes: [
        {
          id: "meal-999",
          title: "Pollo al disco online",
          image: "https://example.com/disco.jpg",
          matchedIngredients: ["pollo", "papas", "cebolla"],
          source: "TheMealDB",
          category: "Carnes",
          ingredients: [
            { name: "pollo", measure: "500 g" },
            { name: "papas", measure: "2 unidades" },
            { name: "cebolla", measure: "1 unidad" },
            { name: "morrón", measure: "1 unidad" },
          ],
        },
      ],
    });

    // 1. El match local no debe haber llamado a la API
    calculateLocalRecipeMatches(pantry, LOCAL_RECIPES);
    expect(searchSpy).not.toHaveBeenCalled();

    // 2. Primera llamada explícita a la búsqueda online
    const firstCall = await fetchOnlineRecipesForPantry(pantry);
    expect(searchSpy).toHaveBeenCalledTimes(1);
    expect(firstCall).toHaveLength(1);
    expect(firstCall[0].name).toBe("Pollo al disco online");
    expect(firstCall[0].isOnline).toBe(true);

    // 3. Segunda llamada con la misma despensa -> debe usar caché en memoria sin volver a llamar
    const secondCall = await fetchOnlineRecipesForPantry(pantry);
    expect(searchSpy).toHaveBeenCalledTimes(1); // Se mantiene en 1 (usó caché)
    expect(secondCall).toEqual(firstCall);
  });
});
