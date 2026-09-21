import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchRecipesByExpiring,
  isGlutenFreeEstimated,
  filterFallbackRecipes,
  translateRecipe,
  getRecipeFallbackImage,
  ProductLike,
  RecipeSuggestion,
} from "../lib/recipeApi";

const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};
(globalThis as any).localStorage = localStorageStub;

describe("recipeApi.ts - Recipe Filtering, Fallbacks, and DeepL Translation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    storage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    storage.clear();
  });

  describe("searchRecipesByExpiring filtering and prioritization", () => {
    it("excludes expired products from recipe search and warns user in Rioplatense", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          meals: [
            {
              idMeal: "123",
              strMeal: "Chicken Curry",
              strMealThumb: "https://example.com/curry.jpg",
            },
          ],
        }),
      } as Response);

      const products: ProductLike[] = [
        { name: "Leche cortada", days: -2, status: "expired" },
        { name: "Yogur vencido", days: 0, status: "expired" },
        { name: "Pollo", days: 2, status: "soon" },
      ];

      const result = await searchRecipesByExpiring(products);

      expect(result.warning).toBe(
        "Tenés 2 productos vencidos: revisalos antes de cocinar. No los usamos en las recetas."
      );
      expect(result.recipes).toHaveLength(1);
      expect(result.recipes[0].matchedIngredients).toContain("Pollo");

      // Verify fetch was called with chicken, NEVER with expired milk or expired yogurt
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const urlCalled = fetchSpy.mock.calls[0][0] as string;
      expect(urlCalled).toContain("chicken");
      expect(urlCalled).not.toContain("leche");
      expect(urlCalled).not.toContain("yogur");
    });

    it("returns 'despensa tranquila' without calling fetch when all products expire in > 7 days", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const products: ProductLike[] = [
        { name: "Arroz", days: 90, status: "ok" },
        { name: "Fideos", days: 120, status: "ok" },
        { name: "Lentejas", days: 45, status: "ok" },
      ];

      const result = await searchRecipesByExpiring(products);

      expect(result.recipes).toHaveLength(0);
      expect(result.info).toBe("No hay nada por vencer, tu despensa está tranquila");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("uses in-memory cache on second search with identical priority ingredients", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          meals: [
            {
              idMeal: "456",
              strMeal: "Spinach Pasta",
              strMealThumb: "https://example.com/spinach.jpg",
            },
          ],
        }),
      } as Response);

      const products: ProductLike[] = [
        { name: "Espinaca", days: 2, status: "soon" },
      ];

      const res1 = await searchRecipesByExpiring(products);
      expect(res1.recipes).toHaveLength(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second identical call
      const res2 = await searchRecipesByExpiring(products);
      expect(res2.recipes).toHaveLength(1);
      // fetch count must NOT increase
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("falls back to local ideas when fetch fails due to network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Failed to fetch"));

      const products: ProductLike[] = [
        { name: "Pechuga de pollo", days: 1, status: "soon" },
        { name: "Tomates cherry", days: 2, status: "soon" },
      ];

      const result = await searchRecipesByExpiring(products);

      expect(result.isLocalFallback).toBe(true);
      expect(result.error).toBe(
        "No pudimos conectar con el recetario. Podés usar las ideas locales."
      );
      expect(result.recipes.length).toBeGreaterThan(0);
      expect(result.recipes.every((r) => r.source === "FreshTrack")).toBe(true);
      expect(result.recipes[0].matchedIngredients.length).toBeGreaterThan(0);
    });
  });

  describe("filterFallbackRecipes and Pantry Matching", () => {
    it("matches user pantry products using token matching and omits recipes with 0 matches", () => {
      const pantry = [
        { name: "Espinaca fresca", quantity: "1 atado" },
        { name: "Huevos de campo", quantity: "6 unidades" },
      ];

      const suggestions = filterFallbackRecipes(pantry);

      expect(suggestions.length).toBeGreaterThan(0);
      const tortilla = suggestions.find((r) => r.id === "fallback-tortilla");
      expect(tortilla).toBeDefined();
      expect(tortilla?.matchedIngredients).toContain("Espinaca fresca");
      expect(tortilla?.matchedIngredients).toContain("Huevos de campo");
      expect(tortilla?.pantryMatchRatio?.matched).toBeGreaterThanOrEqual(2);

      // Verify no recipe has 0 matches
      expect(suggestions.every((r) => (r.pantryMatchRatio?.matched || 0) > 0)).toBe(true);
    });
  });

  describe("isGlutenFreeEstimated", () => {
    it("correctly identifies gluten-free recipes and flags recipes with gluten", () => {
      expect(
        isGlutenFreeEstimated([
          { name: "huevos", measure: "2" },
          { name: "espinaca", measure: "1 atado" },
          { name: "tomates", measure: "2" },
        ])
      ).toBe(true);

      expect(
        isGlutenFreeEstimated([
          { name: "harina de trigo", measure: "200g" },
          { name: "agua", measure: "100ml" },
        ])
      ).toBe(false);

      expect(
        isGlutenFreeEstimated([
          { name: "pasta seca", measure: "250g" },
          { name: "queso", measure: "50g" },
        ])
      ).toBe(false);

      expect(
        isGlutenFreeEstimated([
          { name: "pan tostado", measure: "2 rodajas" },
          { name: "palta", measure: "1" },
        ])
      ).toBe(false);

      expect(
        isGlutenFreeEstimated([
          { name: "avena arrollada", measure: "3 cucharadas" },
          { name: "yogur", measure: "1 pote" },
        ])
      ).toBe(false);
    });
  });

  describe("getRecipeFallbackImage", () => {
    it("generates an SVG data URI with appropriate food emoji", () => {
      const soupSvg = getRecipeFallbackImage("Sopa de verduras");
      expect(soupSvg).toContain("data:image/svg+xml");
      expect(decodeURIComponent(soupSvg)).toContain("🍲");

      const chickenSvg = getRecipeFallbackImage("Pollo al horno");
      expect(decodeURIComponent(chickenSvg)).toContain("🍗");

      const saladSvg = getRecipeFallbackImage("Ensalada fresca");
      expect(decodeURIComponent(saladSvg)).toContain("🥗");
    });
  });

  describe("translateRecipe", () => {
    it("falls back gracefully with isOriginalEnglish: true when translate endpoint fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const recipe: RecipeSuggestion = {
        id: "52772",
        title: "Teriyaki Chicken Casserole",
        image: "https://example.com/meal.jpg",
        matchedIngredients: ["chicken"],
        source: "TheMealDB",
        ingredients: [{ name: "soy sauce", measure: "3/4 cup" }],
        instructions: "Preheat oven to 350 F. Bake for 30 minutes.",
      };

      const translated = await translateRecipe(recipe);

      expect(translated.title).toBe("Teriyaki Chicken Casserole");
      expect(translated.isOriginalEnglish).toBe(true);
    });

    it("translates title, instructions, and ingredients in one call and saves to localStorage", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          translated: true,
          texts: [
            "Guiso de pollo teriyaki",
            "Precalentá el horno a 180°C. Horneá durante 30 minutos.",
            "salsa de soja",
          ],
        }),
      } as Response);

      const recipe: RecipeSuggestion = {
        id: "52772",
        title: "Teriyaki Chicken Casserole",
        image: "https://example.com/meal.jpg",
        matchedIngredients: ["chicken"],
        source: "TheMealDB",
        ingredients: [{ name: "soy sauce", measure: "3/4 cup" }],
        instructions: "Preheat oven to 350 F. Bake for 30 minutes.",
      };

      const translated = await translateRecipe(recipe);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(translated.title).toBe("Guiso de pollo teriyaki");
      expect(translated.instructions).toBe(
        "Precalentá el horno a 180°C. Horneá durante 30 minutos."
      );
      expect(translated.ingredients?.[0].name).toBe("salsa de soja");
      expect(translated.isOriginalEnglish).toBe(false);

      // Verify cached in localStorage
      const cached = localStorage.getItem("freshtrack-recipe-i18n-v1");
      expect(cached).toContain("Guiso de pollo teriyaki");

      // Second call should use localStorage and NOT call fetch
      const secondCall = await translateRecipe(recipe);
      expect(secondCall.title).toBe("Guiso de pollo teriyaki");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
