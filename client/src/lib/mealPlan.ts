import { LOCAL_RECIPES, LocalRecipe } from "./localRecipesMatching";
import { loadJSON, saveJSON } from "./storage";
import { addDaysISO, daysUntil } from "./dates";
import { Product, StoredProduct } from "@/types/product";
import { findBestMatchingItem } from "./ingredientMatching";

export type MealSlot = "almuerzo" | "cena";

export interface PlannedMeal {
  id: string;
  recipeId: string;
  date: string; // Formato YYYY-MM-DD en hora local
  slot: MealSlot;
  portions: number;
}

export const MEAL_PLAN_STORAGE_KEY = "freshtrack-meal-plan-v1";

/**
 * Ventana de retención para comidas pasadas: 30 días.
 * Permite consultar qué se cocinó durante el último mes descartando datos obsoletos.
 */
export const PAST_MEALS_RETENTION_DAYS = 30;

/**
 * Obtiene el lunes correspondiente a la semana de la fecha dada (hora local).
 */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = current.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(current.getFullYear(), current.getMonth(), current.getDate() + diffToMonday);
}

/**
 * Retorna las 7 fechas ISO (YYYY-MM-DD) de la semana que inicia en lunes para una fecha dada.
 */
export function getWeekDaysISO(baseDate: Date = new Date()): string[] {
  const monday = getMondayOfWeek(baseDate);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDaysISO(i, monday));
  }
  return days;
}

/**
 * Limpia entradas con recetas inexistentes y aquellas que superen la ventana de retención pasada.
 */
export function cleanOrphanAndOldMeals(
  meals: PlannedMeal[],
  validRecipes: LocalRecipe[] = LOCAL_RECIPES,
  today: Date = new Date(),
  retentionDays: number = PAST_MEALS_RETENTION_DAYS
): PlannedMeal[] {
  if (!Array.isArray(meals)) return [];
  const validRecipeIds = new Set(validRecipes.map((r) => r.id));

  return meals.filter((meal) => {
    // 1. Descartar si la receta no existe
    if (!meal || !validRecipeIds.has(meal.recipeId)) {
      return false;
    }
    // 2. Descartar si la fecha es inválida
    if (typeof meal.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(meal.date)) {
      return false;
    }
    // 3. Descartar comidas anteriores a la ventana de retención (ej. más de 30 días pasados)
    const diff = daysUntil(meal.date, today);
    if (diff < -retentionDays) {
      return false;
    }
    // 4. Validar slot y porciones
    if (meal.slot !== "almuerzo" && meal.slot !== "cena") {
      return false;
    }
    if (typeof meal.portions !== "number" || meal.portions <= 0) {
      return false;
    }

    return true;
  });
}

/**
 * Carga el planificador semanal desde localStorage limpiando entradas inválidas.
 */
export function loadMealPlan(
  validRecipes: LocalRecipe[] = LOCAL_RECIPES,
  today: Date = new Date()
): PlannedMeal[] {
  const loaded = loadJSON<PlannedMeal[]>(MEAL_PLAN_STORAGE_KEY, []);
  return cleanOrphanAndOldMeals(loaded, validRecipes, today);
}

/**
 * Guarda el planificador semanal en localStorage de forma segura con saveJSON.
 */
export function saveMealPlan(meals: PlannedMeal[]): boolean {
  if (!Array.isArray(meals)) return false;
  return saveJSON(MEAL_PLAN_STORAGE_KEY, meals);
}

/**
 * Agrega o reemplaza la receta asignada a una franja de un día específico.
 * Una franja solo puede tener una receta a la vez.
 */
export function setMealSlot(
  currentMeals: PlannedMeal[],
  recipeId: string,
  date: string,
  slot: MealSlot,
  portions: number = 2
): PlannedMeal[] {
  // Quitamos cualquier comida previa en ese mismo día y slot
  const withoutSlot = currentMeals.filter(
    (m) => !(m.date === date && m.slot === slot)
  );

  const newMeal: PlannedMeal = {
    id: `meal-${date}-${slot}-${Date.now()}`,
    recipeId,
    date,
    slot,
    portions: Math.max(1, portions),
  };

  return [...withoutSlot, newMeal];
}

/**
 * Elimina una comida planificada por su ID.
 */
export function removePlannedMeal(
  currentMeals: PlannedMeal[],
  mealId: string
): PlannedMeal[] {
  return currentMeals.filter((m) => m.id !== mealId);
}

/**
 * Verifica si alguna comida planificada utiliza un alimento de la despensa que vencerá
 * antes de la fecha en que se planificó cocinarla.
 */
export function checkEarlyExpiryForPlannedMeal(
  meal: PlannedMeal,
  recipe: LocalRecipe,
  pantry: Array<Product | StoredProduct>
): { hasEarlyExpiry: boolean; expiredItems: string[] } {
  const expiredItems: string[] = [];

  for (const ingredient of recipe.ingredients) {
    const matched = findBestMatchingItem(pantry, { name: ingredient.name });
    if (matched && matched.expiryDate) {
      // Si la fecha de vencimiento del producto en despensa es estrictamente anterior a la fecha planificada
      if (matched.expiryDate < meal.date) {
        expiredItems.push(`${matched.name} (vence el ${matched.expiryDate})`);
      }
    }
  }

  return {
    hasEarlyExpiry: expiredItems.length > 0,
    expiredItems,
  };
}
