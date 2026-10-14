import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackupObject, restoreBackupJSON } from "../lib/backup";
import { FAVORITE_RECIPES_STORAGE_KEY } from "../lib/favoriteRecipes";
import { MEAL_PLAN_STORAGE_KEY } from "../lib/mealPlan";
import { PRODUCTS_STORAGE_KEY } from "../lib/storage";
import { IMPACT_STATS_STORAGE_KEY } from "../lib/impactStats";
import { NOTIFICATION_PREFS_KEY } from "../lib/notificationRules";
import { DATE_LEARNING_STORAGE_KEY } from "../lib/dateRecognition";
import { SHELF_LIFE_CORRECTIONS_KEY } from "../lib/shelfLifeCatalog";
import { EXPIRED_HISTORY_KEY } from "../lib/reportsData";
import { SHOPPING_LIST_STORAGE_KEY } from "../lib/shoppingList";
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
    expect(store["freshtrack-theme"]).toBe("dark");
    expect(store["theme"]).toBe("dark");
  });

  it("construye y restaura backup completo con impacto, preferencias de notificación, reglas y shoppingList", () => {
    store[IMPACT_STATS_STORAGE_KEY] = JSON.stringify({
      month: "2026-10",
      mealsSaved: 4,
      kgSaved: 5.5,
      moneySaved: 15000,
      actions: 4,
    });
    store[NOTIFICATION_PREFS_KEY] = JSON.stringify({
      enabled: true,
      weeklySummary: true,
      summaryDay: "domingo",
      categoryLeadDays: { Lácteos: 3 },
    });
    store[SHOPPING_LIST_STORAGE_KEY] = JSON.stringify([
      { id: "s-1", name: "Leche", category: "Lácteos", quantity: "1 L", completed: false, createdAt: "2026-10-10" },
    ]);
    store[DATE_LEARNING_STORAGE_KEY] = JSON.stringify([
      { brandName: "La Serenísima", defaultLabel: "vencimiento", corrections: 2, updatedAt: "2026-10-10" },
    ]);
    store[SHELF_LIFE_CORRECTIONS_KEY] = JSON.stringify({
      queso: { productName: "Queso", normalizedName: "queso", closedDays: 20, openDays: 7, updatedAt: "2026-10-10" },
    });
    store[EXPIRED_HISTORY_KEY] = JSON.stringify([
      { id: "e-1", name: "Yogur", category: "Lácteos", expiredAt: "2026-10-09" },
    ]);

    const backup = buildBackupObject(MOCK_PRODUCTS);
    expect(backup.impactStats?.kgSaved).toBe(5.5);
    expect(backup.notificationPreferences?.weeklySummary).toBe(true);
    expect(backup.shoppingList).toHaveLength(1);
    expect(backup.dateLearningRules).toHaveLength(1);
    expect(backup.shelfLifeCorrections?.queso?.closedDays).toBe(20);
    expect(backup.expiredHistory).toHaveLength(1);

    // Clear store to simulate new browser/device
    store = {};

    const res = restoreBackupJSON(JSON.stringify(backup));
    expect(res.success).toBe(true);

    const restoredImpact = JSON.parse(store[IMPACT_STATS_STORAGE_KEY]);
    expect(restoredImpact.moneySaved).toBe(15000);

    const restoredPrefs = JSON.parse(store[NOTIFICATION_PREFS_KEY]);
    expect(restoredPrefs.categoryLeadDays?.["Lácteos"]).toBe(3);

    const restoredShopping = JSON.parse(store[SHOPPING_LIST_STORAGE_KEY]);
    expect(restoredShopping[0].name).toBe("Leche");

    const restoredCorrections = JSON.parse(store[SHELF_LIFE_CORRECTIONS_KEY]);
    expect(restoredCorrections.queso.closedDays).toBe(20);
  });

  it("filtra productos corruptos o incompletos y conserva sólo los válidos", () => {
    const mixedBackup = {
      version: 1,
      exportedAt: "2026-10-10T12:00:00Z",
      products: [
        MOCK_PRODUCTS[0],
        { id: "corrupto-sin-nombre", category: "Lácteos", expiryDate: "2026-11-01" }, // inválido
        { id: 3, name: "Fecha Invalida", category: "Lácteos", expiryDate: "2026-02-31", quantity: "1", icon: "🥛" }, // fecha falsa 31 feb
        {
          id: 4,
          name: "Manteca",
          category: "Lácteos",
          expiryDate: "2026-11-15",
          quantity: "200 g",
          icon: "🧈",
          dateLabel: "vencimiento",
        },
      ],
      consumptionHistory: [],
      shoppingList: [],
    };

    const res = restoreBackupJSON(JSON.stringify(mixedBackup));
    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
    expect(res.message).toContain("2 válidos, 2 descartados por formato inválido");

    const saved = JSON.parse(store[PRODUCTS_STORAGE_KEY]);
    expect(saved).toHaveLength(2);
    expect(saved[0].name).toBe("Arroz");
    expect(saved[1].name).toBe("Manteca");
  });

  it("rechaza archivos con formato JSON dañado o sin ningún producto válido", () => {
    const invalidJson = "{ corrupt: true, ";
    expect(restoreBackupJSON(invalidJson).success).toBe(false);

    const invalidStructure = JSON.stringify({ something: "else" });
    expect(restoreBackupJSON(invalidStructure).success).toBe(false);

    const allCorrupt = JSON.stringify({
      version: 1,
      products: [{ invalid: true }],
    });
    const resCorrupt = restoreBackupJSON(allCorrupt);
    expect(resCorrupt.success).toBe(false);
    expect(resCorrupt.message).toContain("no cumplen con el formato requerido");
  });
});
