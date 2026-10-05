import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanOrphanFavorites,
  isFavorite,
  loadFavorites,
  saveFavorites,
  toggleFavorite,
  FAVORITE_RECIPES_STORAGE_KEY,
} from "../lib/favoriteRecipes";
import { LocalRecipe } from "../lib/localRecipesMatching";

const MOCK_RECIPES: LocalRecipe[] = [
  {
    id: "receta-1",
    name: "Milanesas",
    category: "Carnes",
    ingredients: [],
    instructions: [],
  },
  {
    id: "receta-2",
    name: "Ensalada",
    category: "Ensaladas",
    ingredients: [],
    instructions: [],
  },
];

describe("favoriteRecipes - Gestión y persistencia de favoritos", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    };
    globalThis.localStorage = mockStorage as any;
    vi.restoreAllMocks();
  });

  it("conmuta el estado de favorito (alta y baja)", () => {
    let favs: string[] = [];

    // Alta
    favs = toggleFavorite("receta-1", favs);
    expect(favs).toEqual(["receta-1"]);
    expect(isFavorite("receta-1", favs)).toBe(true);

    // Otra alta
    favs = toggleFavorite("receta-2", favs);
    expect(favs).toContain("receta-1");
    expect(favs).toContain("receta-2");

    // Baja
    favs = toggleFavorite("receta-1", favs);
    expect(favs).toEqual(["receta-2"]);
    expect(isFavorite("receta-1", favs)).toBe(false);
  });

  it("guarda y carga favoritos desde localStorage", () => {
    const list = ["receta-1", "receta-2"];
    const saved = saveFavorites(list);
    expect(saved).toBe(true);

    const loaded = loadFavorites(MOCK_RECIPES);
    expect(loaded).toEqual(["receta-1", "receta-2"]);
  });

  it("descarta IDs huérfanos que ya no existen en el recetario", () => {
    const listWithOrphans = ["receta-1", "receta-inexistente-99", "receta-borrada"];
    const cleaned = cleanOrphanFavorites(listWithOrphans, MOCK_RECIPES);

    expect(cleaned).toEqual(["receta-1"]);
    expect(cleaned).not.toContain("receta-inexistente-99");
  });

  it("tolera localStorage corrupto retornando array vacío sin lanzar excepciones", () => {
    localStorage.setItem(FAVORITE_RECIPES_STORAGE_KEY, "JSON_INVALIDO_MALFORMADO{{[[");

    const loaded = loadFavorites(MOCK_RECIPES);
    expect(loaded).toEqual([]);
  });

  it("tolera error de cuota excedida al guardar sin romperse", () => {
    const setItemSpy = vi.spyOn(globalThis.localStorage, "setItem").mockImplementation(() => {
      const err = new DOMException("QuotaExceededError", "QuotaExceededError");
      throw err;
    });

    const result = saveFavorites(["receta-1"]);
    expect(result).toBe(false);
    setItemSpy.mockRestore();
  });
});
