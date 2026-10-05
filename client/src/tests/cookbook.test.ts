import { describe, expect, it } from "vitest";
import {
  filterAndSortCookbook,
  getCookbookCategories,
  recipeMatchesDietary,
} from "../lib/cookbook";
import { LocalRecipe, RecipeMatchResult } from "../lib/localRecipesMatching";

const MOCK_RECIPES: LocalRecipe[] = [
  {
    id: "receta-1",
    name: "Milanesas con puré de papas",
    category: "Carnes",
    ingredients: [
      { name: "nalga en fetas", quantity: "500 g" },
      { name: "papas", quantity: "1 kg" },
      { name: "huevos", quantity: "2 unidades" },
      { name: "pan rallado", quantity: "200 g" },
    ],
    instructions: ["Pasar la carne por huevo y pan rallado.", "Freír u hornear.", "Hacer el puré."],
    tags: ["clásico"],
  },
  {
    id: "receta-2",
    name: "Ensalada rápida de tomate y albahaca",
    category: "Ensaladas",
    ingredients: [
      { name: "tomates perita", quantity: "3 unidades" },
      { name: "albahaca fresca", quantity: "1 atado" },
      { name: "aceite de oliva", quantity: "2 cucharadas" },
    ],
    instructions: ["Cortar los tomates.", "Mezclar con hojas de albahaca y condimentar."],
    tags: ["vegetariano", "rapida"],
  },
  {
    id: "receta-3",
    name: "Guiso de lentejas sin TACC",
    category: "Guisos",
    ingredients: [
      { name: "lentejas", quantity: "400 g" },
      { name: "zanahoria", quantity: "1 unidad" },
      { name: "cebolla", quantity: "1 unidad" },
    ],
    instructions: ["Saltear verduras.", "Agregar lentejas y cocinar."],
    tags: ["vegetariano"],
  },
];

describe("cookbook - Búsqueda, filtros y orden del Recetario", () => {
  it("extrae las categorías únicas ordenadas con 'Todas' al inicio", () => {
    const categories = getCookbookCategories(MOCK_RECIPES);
    expect(categories).toEqual(["Todas", "Carnes", "Ensaladas", "Guisos"]);
  });

  it("busca por nombre ignorando tildes y mayúsculas", () => {
    // Búsqueda con 'pure' sin tilde encuentra 'puré'
    const results = filterAndSortCookbook(MOCK_RECIPES, { searchQuery: "pure" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("receta-1");

    // Búsqueda en mayúsculas
    const results2 = filterAndSortCookbook(MOCK_RECIPES, { searchQuery: "MILANESA" });
    expect(results2).toHaveLength(1);
    expect(results2[0].id).toBe("receta-1");
  });

  it("busca por nombre de ingrediente", () => {
    // 'albahaca' está en los ingredientes de receta-2
    const results = filterAndSortCookbook(MOCK_RECIPES, { searchQuery: "albahaca" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("receta-2");

    // 'zanahoria' está en receta-3
    const results2 = filterAndSortCookbook(MOCK_RECIPES, { searchQuery: "zanahoria" });
    expect(results2).toHaveLength(1);
    expect(results2[0].id).toBe("receta-3");
  });

  it("filtra por categoría específica", () => {
    const results = filterAndSortCookbook(MOCK_RECIPES, { category: "Ensaladas" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain("Ensalada");
  });

  it("filtra por recetas favoritas con un Set de ids", () => {
    const favs = new Set(["receta-2", "receta-3"]);
    const results = filterAndSortCookbook(MOCK_RECIPES, {
      onlyFavorites: true,
      favoriteIds: favs,
    });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(["receta-2", "receta-3"]);
  });

  it("aplica filtros dietarios (vegetariano, sin gluten estimado, rápida)", () => {
    // Vegetariana descarta milanesas
    expect(recipeMatchesDietary(MOCK_RECIPES[1], "vegetarian")).toBe(true);
    expect(recipeMatchesDietary(MOCK_RECIPES[0], "vegetarian")).toBe(false);
    const veg = filterAndSortCookbook(MOCK_RECIPES, { dietary: "vegetarian" });
    expect(veg.map((r) => r.id)).toEqual(["receta-2", "receta-3"]);

    // Sin gluten descarta receta-1 (pan rallado)
    const gf = filterAndSortCookbook(MOCK_RECIPES, { dietary: "glutenFree" });
    expect(gf.map((r) => r.id)).toEqual(["receta-2", "receta-3"]);

    // Rápida identifica ensalada
    const quick = filterAndSortCookbook(MOCK_RECIPES, { dietary: "quick" });
    expect(quick.map((r) => r.id)).toContain("receta-2");
  });

  it("filtra 'puedo hacerla con mi despensa' según tier ready", () => {
    const matchesMap = new Map<string, RecipeMatchResult>([
      [
        "receta-1",
        {
          recipe: MOCK_RECIPES[0],
          matchedIngredients: ["papas"],
          missingIngredients: [{ name: "nalga en fetas" }],
          matchRatio: { matched: 1, total: 4, percentage: 25 },
          tier: "more",
        },
      ],
      [
        "receta-2",
        {
          recipe: MOCK_RECIPES[1],
          matchedIngredients: ["tomates perita", "albahaca fresca", "aceite de oliva"],
          missingIngredients: [],
          matchRatio: { matched: 3, total: 3, percentage: 100 },
          tier: "ready",
        },
      ],
    ]);

    const results = filterAndSortCookbook(MOCK_RECIPES, {
      onlyAvailablePantry: true,
      matchesMap,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("receta-2");
  });

  it("ordena por favoritas primero", () => {
    const favs = new Set(["receta-3"]);
    const results = filterAndSortCookbook(MOCK_RECIPES, {
      sortBy: "favoritesFirst",
      favoriteIds: favs,
    });

    expect(results[0].id).toBe("receta-3");
  });

  it("ordena por mayor porcentaje de match de despensa", () => {
    const matchesMap = new Map<string, RecipeMatchResult>([
      [
        "receta-1",
        {
          recipe: MOCK_RECIPES[0],
          matchedIngredients: ["papas"],
          missingIngredients: [{ name: "nalga en fetas" }],
          matchRatio: { matched: 1, total: 4, percentage: 25 },
          tier: "more",
        },
      ],
      [
        "receta-3",
        {
          recipe: MOCK_RECIPES[2],
          matchedIngredients: ["lentejas", "zanahoria"],
          missingIngredients: [{ name: "cebolla" }],
          matchRatio: { matched: 2, total: 3, percentage: 67 },
          tier: "almost",
        },
      ],
    ]);

    const results = filterAndSortCookbook(MOCK_RECIPES, {
      sortBy: "pantryMatch",
      matchesMap,
    });

    // receta-3 (67%) va antes de receta-1 (25%)
    const idxReceta3 = results.findIndex((r) => r.id === "receta-3");
    const idxReceta1 = results.findIndex((r) => r.id === "receta-1");
    expect(idxReceta3).toBeLessThan(idxReceta1);
  });
});
