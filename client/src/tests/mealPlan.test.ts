import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanOrphanAndOldMeals,
  getMondayOfWeek,
  getWeekDaysISO,
  loadMealPlan,
  removePlannedMeal,
  saveMealPlan,
  setMealSlot,
  checkEarlyExpiryForPlannedMeal,
  PlannedMeal,
} from "../lib/mealPlan";
import { LocalRecipe } from "../lib/localRecipesMatching";
import { Product } from "@/types/product";

const MOCK_RECIPES: LocalRecipe[] = [
  {
    id: "receta-1",
    name: "Milanesas con puré",
    category: "Carnes",
    ingredients: [{ name: "carne", quantity: "500 g" }],
    instructions: [],
  },
  {
    id: "receta-2",
    name: "Tarta de verdura",
    category: "Tartas",
    ingredients: [{ name: "espinaca", quantity: "1 atado" }],
    instructions: [],
  },
];

describe("mealPlan - Planificador semanal de comidas", () => {
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

  it("calcula la semana completa iniciando siempre en lunes (incluso en domingo)", () => {
    // Miércoles 7 de Octubre de 2026
    const wednesday = new Date(2026, 9, 7);
    const monday = getMondayOfWeek(wednesday);
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(9);
    expect(monday.getDate()).toBe(5); // Lunes 5 de Octubre

    const week = getWeekDaysISO(wednesday);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-10-05"); // Lunes
    expect(week[6]).toBe("2026-10-11"); // Domingo

    // Domingo 11 de Octubre de 2026 (debe seguir perteneciendo a la semana del lunes 5)
    const sunday = new Date(2026, 9, 11);
    const sundayWeek = getWeekDaysISO(sunday);
    expect(sundayWeek[0]).toBe("2026-10-05");
    expect(sundayWeek[6]).toBe("2026-10-11");
  });

  it("maneja correctamente transiciones de fin de mes y de año en la semana", () => {
    // 31 de Diciembre de 2026 (Jueves)
    const dec31 = new Date(2026, 11, 31);
    const week = getWeekDaysISO(dec31);

    expect(week[0]).toBe("2026-12-28"); // Lunes 28 de diciembre
    expect(week[3]).toBe("2026-12-31"); // Jueves 31 de diciembre
    expect(week[4]).toBe("2027-01-01"); // Viernes 1 de enero de 2027
    expect(week[6]).toBe("2027-01-03"); // Domingo 3 de enero de 2027
  });

  it("admite exactamente una receta por franja (almuerzo / cena) reemplazando la previa", () => {
    let plan: PlannedMeal[] = [];

    // Asignar almuerzo del lunes
    plan = setMealSlot(plan, "receta-1", "2026-10-05", "almuerzo", 4);
    expect(plan).toHaveLength(1);
    expect(plan[0].recipeId).toBe("receta-1");
    expect(plan[0].portions).toBe(4);

    // Asignar cena del lunes (diferente franja -> se agrega)
    plan = setMealSlot(plan, "receta-2", "2026-10-05", "cena", 2);
    expect(plan).toHaveLength(2);

    // Reemplazar almuerzo del lunes por receta-2
    plan = setMealSlot(plan, "receta-2", "2026-10-05", "almuerzo", 2);
    expect(plan).toHaveLength(2);
    const almuerzo = plan.find((m) => m.date === "2026-10-05" && m.slot === "almuerzo");
    expect(almuerzo?.recipeId).toBe("receta-2");
  });

  it("elimina una comida del plan por id", () => {
    let plan = setMealSlot([], "receta-1", "2026-10-05", "almuerzo");
    const mealId = plan[0].id;
    plan = removePlannedMeal(plan, mealId);
    expect(plan).toHaveLength(0);
  });

  it("limpia recetas huérfanas y comidas que superan la ventana de retención (30 días)", () => {
    const today = new Date(2026, 9, 15); // 15 de octubre de 2026

    const rawPlan: PlannedMeal[] = [
      {
        id: "m1",
        recipeId: "receta-1",
        date: "2026-10-14", // Ayer (válida)
        slot: "almuerzo",
        portions: 2,
      },
      {
        id: "m2",
        recipeId: "receta-inexistente-xyz", // Receta borrada (huérfana)
        date: "2026-10-16",
        slot: "cena",
        portions: 2,
      },
      {
        id: "m3",
        recipeId: "receta-1",
        date: "2026-08-01", // Hace más de 60 días (fuera de retención)
        slot: "almuerzo",
        portions: 2,
      },
    ];

    const cleaned = cleanOrphanAndOldMeals(rawPlan, MOCK_RECIPES, today, 30);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe("m1");
  });

  it("detecta si un alimento en despensa vencerá antes de la fecha planificada", () => {
    const pantry: Product[] = [
      {
        id: 1,
        name: "Carne picada",
        category: "Carnes",
        expiryDate: "2026-10-06", // Vence el 6
        quantity: "500 g",
        icon: "🥩",
        days: 1,
        status: "soon",
        expiry: "6 oct",
      },
    ];

    const meal: PlannedMeal = {
      id: "m-test",
      recipeId: "receta-1",
      date: "2026-10-10", // Planificada para el 10 (después del vencimiento)
      slot: "almuerzo",
      portions: 2,
    };

    const check = checkEarlyExpiryForPlannedMeal(meal, MOCK_RECIPES[0], pantry);
    expect(check.hasEarlyExpiry).toBe(true);
    expect(check.expiredItems.length).toBeGreaterThan(0);
    expect(check.expiredItems[0]).toContain("Carne picada");
  });

  it("persiste y carga el plan desde localStorage", () => {
    const plan: PlannedMeal[] = [
      { id: "m1", recipeId: "receta-1", date: "2026-10-05", slot: "almuerzo", portions: 2 },
    ];
    expect(saveMealPlan(plan)).toBe(true);
    const loaded = loadMealPlan(MOCK_RECIPES, new Date(2026, 9, 5));
    expect(loaded).toEqual(plan);
  });
});
