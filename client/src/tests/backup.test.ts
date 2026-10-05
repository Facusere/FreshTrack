import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackupObject, restoreBackupJSON } from "../lib/backup";
import { FAVORITE_RECIPES_STORAGE_KEY } from "../lib/favoriteRecipes";
import { MEAL_PLAN_STORAGE_KEY } from "../lib/mealPlan";
import { PRODUCTS_STORAGE_KEY } from "../lib/storage";
import { StoredProduct } from "@/types/product";

const MOCK_PRODUCTS: StoredProduct[] = [
  {
    id: 1,
    name: "Arroz",
    category: "Almacén seco",
    expiryDate: "2026-12-01",
    quantity: "1 kg",
    icon: "🌾",
    dateLabel: "vencimiento",
  },
];

describe("backup - Exportación y restauración con soporte para Recetario y Planificador", () => {
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

  it("construye el objeto de backup incluyendo favoriteRecipes y mealPlan", () => {
    store[FAVORITE_RECIPES_STORAGE_KEY] = JSON.stringify(["receta-1", "receta-2"]);
    store[MEAL_PLAN_STORAGE_KEY] = JSON.stringify([
      { id: "m1", recipeId: "receta-1", date: "2026-10-05", slot: "almuerzo", portions: 2 },
    ]);

    const backup = buildBackupObject(MOCK_PRODUCTS);

    expect(backup.version).toBe(1);
    expect(backup.products).toEqual(MOCK_PRODUCTS);
    expect(backup.favoriteRecipes).toEqual(["receta-1", "receta-2"]);
    expect(backup.mealPlan).toHaveLength(1);
    expect(backup.mealPlan?.[0].recipeId).toBe("receta-1");
  });

  it("restaura correctamente un backup completo con favoriteRecipes y mealPlan", () => {
    const backupData = {
      version: 1,
      exportedAt: "2026-10-05T10:00:00Z",
      products: MOCK_PRODUCTS,
      consumptionHistory: [],
      shoppingList: [],
      favoriteRecipes: ["receta-albondigas", "receta-lentejas"],
      mealPlan: [
        {
          id: "m-test",
          recipeId: "receta-albondigas",
          date: "2026-10-06",
          slot: "cena",
          portions: 4,
        },
      ],
    };

    const res = restoreBackupJSON(JSON.stringify(backupData));
    expect(res.success).toBe(true);

    const savedFavs = JSON.parse(store[FAVORITE_RECIPES_STORAGE_KEY]);
    expect(savedFavs).toEqual(["receta-albondigas", "receta-lentejas"]);

    const savedMeals = JSON.parse(store[MEAL_PLAN_STORAGE_KEY]);
    expect(savedMeals).toHaveLength(1);
    expect(savedMeals[0].recipeId).toBe("receta-albondigas");
  });

  it("mantiene retrocompatibilidad restaurando backups legados que no contienen favoriteRecipes ni mealPlan", () => {
    const legacyBackup = {
      version: 1,
      exportedAt: "2026-08-01T10:00:00Z",
      products: MOCK_PRODUCTS,
      consumptionHistory: [],
      shoppingList: [],
      theme: "dark",
    };

    const res = restoreBackupJSON(JSON.stringify(legacyBackup));
    expect(res.success).toBe(true);

    // No debe lanzar errores ni escribir valores corruptos
    expect(store[FAVORITE_RECIPES_STORAGE_KEY]).toBeUndefined();
    expect(store[MEAL_PLAN_STORAGE_KEY]).toBeUndefined();
    expect(store[PRODUCTS_STORAGE_KEY]).toBeDefined();
  });
});
