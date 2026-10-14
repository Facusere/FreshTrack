import {
  PRODUCTS_STORAGE_KEY,
  CONSUMPTION_HISTORY_KEY,
  loadJSON,
  saveJSON,
  isValidStoredProduct,
} from "./storage";
import { StoredProduct, Product } from "@/types/product";
import { FAVORITE_RECIPES_STORAGE_KEY } from "./favoriteRecipes";
import { MEAL_PLAN_STORAGE_KEY, PlannedMeal } from "./mealPlan";
import { SHOPPING_LIST_STORAGE_KEY, ShoppingItem } from "./shoppingList";
import { IMPACT_STATS_STORAGE_KEY, ImpactStats } from "./impactStats";
import { NOTIFICATION_PREFS_KEY, NotificationPreferences } from "./notificationRules";
import { DATE_LEARNING_STORAGE_KEY, DateLearningRule } from "./dateRecognition";
import { SHELF_LIFE_CORRECTIONS_KEY, ShelfLifeCorrection } from "./shelfLifeCatalog";
import {
  EXPIRED_HISTORY_KEY,
  MONTHLY_IMPACT_HISTORY_KEY,
  HistoricalExpiredItem,
  MonthlyImpactPoint,
} from "./reportsData";

export interface FreshTrackBackup {
  version: number;
  exportedAt: string;
  products: StoredProduct[];
  consumptionHistory: any[];
  shoppingList: ShoppingItem[];
  favoriteRecipes?: string[];
  mealPlan?: PlannedMeal[];
  impactStats?: ImpactStats;
  notificationPreferences?: NotificationPreferences;
  dateLearningRules?: DateLearningRule[];
  shelfLifeCorrections?: Record<string, ShelfLifeCorrection>;
  expiredHistory?: HistoricalExpiredItem[];
  monthlyImpactHistory?: MonthlyImpactPoint[];
  theme?: string;
}

/**
 * Construye el objeto completo de backup para exportar o validar.
 */
export function buildBackupObject(products: StoredProduct[]): FreshTrackBackup {
  const history = loadJSON<any[]>(CONSUMPTION_HISTORY_KEY, []);
  const shopping = loadJSON<ShoppingItem[]>(SHOPPING_LIST_STORAGE_KEY, []);
  const favoriteRecipes = loadJSON<string[]>(FAVORITE_RECIPES_STORAGE_KEY, []);
  const mealPlan = loadJSON<PlannedMeal[]>(MEAL_PLAN_STORAGE_KEY, []);
  const impactStats = loadJSON<ImpactStats | undefined>(IMPACT_STATS_STORAGE_KEY, undefined);
  const notificationPreferences = loadJSON<NotificationPreferences | undefined>(
    NOTIFICATION_PREFS_KEY,
    undefined
  );
  const dateLearningRules = loadJSON<DateLearningRule[] | undefined>(
    DATE_LEARNING_STORAGE_KEY,
    undefined
  );
  const shelfLifeCorrections = loadJSON<Record<string, ShelfLifeCorrection> | undefined>(
    SHELF_LIFE_CORRECTIONS_KEY,
    undefined
  );
  const expiredHistory = loadJSON<HistoricalExpiredItem[] | undefined>(
    EXPIRED_HISTORY_KEY,
    undefined
  );
  const monthlyImpactHistory = loadJSON<MonthlyImpactPoint[] | undefined>(
    MONTHLY_IMPACT_HISTORY_KEY,
    undefined
  );
  const theme =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("freshtrack-theme") || localStorage.getItem("theme") || "light"
      : "light";

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    products: products.filter(isValidStoredProduct),
    consumptionHistory: history,
    shoppingList: shopping,
    favoriteRecipes: favoriteRecipes.length > 0 ? favoriteRecipes : undefined,
    mealPlan: mealPlan.length > 0 ? mealPlan : undefined,
    impactStats,
    notificationPreferences,
    dateLearningRules: dateLearningRules && dateLearningRules.length > 0 ? dateLearningRules : undefined,
    shelfLifeCorrections:
      shelfLifeCorrections && Object.keys(shelfLifeCorrections).length > 0
        ? shelfLifeCorrections
        : undefined,
    expiredHistory: expiredHistory && expiredHistory.length > 0 ? expiredHistory : undefined,
    monthlyImpactHistory:
      monthlyImpactHistory && monthlyImpactHistory.length > 0 ? monthlyImpactHistory : undefined,
    theme,
  };
}

/**
 * Downloads a complete FreshTrack backup file as formatted JSON.
 */
export function exportBackupJSON(products: StoredProduct[]): void {
  const backup = buildBackupObject(products);

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
  const downloadAnchor = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute("href", jsonString);
  downloadAnchor.setAttribute("download", `FreshTrack-Backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Exports current inventory as a CSV file compatible with Excel / Google Sheets.
 */
export function exportInventoryCSV(products: Product[]): void {
  const headers = ["Nombre", "Categoría", "Ubicación", "Cantidad", "Fecha Vencimiento", "Días Restantes", "Estado", "Envase"];
  const rows = products.map((p) => [
    `"${(p.name || "").replace(/"/g, '""')}"`,
    `"${(p.category || "").replace(/"/g, '""')}"`,
    `"${(p.location || "Alacena").replace(/"/g, '""')}"`,
    `"${(p.quantity || "1").replace(/"/g, '""')}"`,
    p.expiryDate || "",
    p.days ?? "",
    p.status === "ok" ? "En fecha" : p.status === "soon" ? "Por vencer" : "Vencido",
    p.state === "abierto" ? "Abierto" : "Cerrado",
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute("href", url);
  downloadAnchor.setAttribute("download", `FreshTrack-Despensa-${dateStr}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Validates and restores a backup JSON string.
 */
export function restoreBackupJSON(
  jsonText: string
): { success: boolean; message: string; count?: number } {
  try {
    const data = JSON.parse(jsonText);
    if (!data || typeof data !== "object") {
      return { success: false, message: "El archivo no contiene un formato JSON válido." };
    }

    if (!Array.isArray(data.products)) {
      return { success: false, message: "El archivo no contiene una lista de alimentos válida." };
    }

    // Filter and validate products
    const validProducts = data.products.filter(isValidStoredProduct);
    if (data.products.length > 0 && validProducts.length === 0) {
      return {
        success: false,
        message: "Los alimentos contenidos en el archivo no cumplen con el formato requerido.",
      };
    }

    // Save restored products
    saveJSON(PRODUCTS_STORAGE_KEY, validProducts);

    // Save history if available
    if (Array.isArray(data.consumptionHistory)) {
      saveJSON(CONSUMPTION_HISTORY_KEY, data.consumptionHistory);
    }

    // Save shopping list if available
    if (Array.isArray(data.shoppingList)) {
      saveJSON(SHOPPING_LIST_STORAGE_KEY, data.shoppingList);
    }

    // Save favorite recipes if available and valid
    if (Array.isArray(data.favoriteRecipes)) {
      const validFavs = data.favoriteRecipes.filter((id: unknown) => typeof id === "string");
      saveJSON(FAVORITE_RECIPES_STORAGE_KEY, validFavs);
    }

    // Save meal plan if available and valid
    if (Array.isArray(data.mealPlan)) {
      const validMeals = data.mealPlan.filter(
        (m: any) =>
          m &&
          typeof m.id === "string" &&
          typeof m.recipeId === "string" &&
          typeof m.date === "string" &&
          (m.slot === "almuerzo" || m.slot === "cena") &&
          typeof m.portions === "number"
      );
      saveJSON(MEAL_PLAN_STORAGE_KEY, validMeals);
    }

    // Save impact stats if available
    if (data.impactStats && typeof data.impactStats === "object") {
      saveJSON(IMPACT_STATS_STORAGE_KEY, data.impactStats);
    }

    // Save notification preferences if available
    if (data.notificationPreferences && typeof data.notificationPreferences === "object") {
      saveJSON(NOTIFICATION_PREFS_KEY, data.notificationPreferences);
    }

    // Save date learning rules if available
    if (Array.isArray(data.dateLearningRules)) {
      saveJSON(DATE_LEARNING_STORAGE_KEY, data.dateLearningRules);
    }

    // Save shelf life corrections if available
    if (data.shelfLifeCorrections && typeof data.shelfLifeCorrections === "object") {
      saveJSON(SHELF_LIFE_CORRECTIONS_KEY, data.shelfLifeCorrections);
    }

    // Save expired history if available
    if (Array.isArray(data.expiredHistory)) {
      saveJSON(EXPIRED_HISTORY_KEY, data.expiredHistory);
    }

    // Save monthly impact history if available
    if (Array.isArray(data.monthlyImpactHistory)) {
      saveJSON(MONTHLY_IMPACT_HISTORY_KEY, data.monthlyImpactHistory);
    }

    // Restore theme preference
    if (data.theme && (data.theme === "dark" || data.theme === "light")) {
      try {
        localStorage.setItem("freshtrack-theme", data.theme);
        localStorage.setItem("theme", data.theme);
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", data.theme === "dark");
        }
      } catch {
        // Ignored if storage or DOM is inaccessible
      }
    }

    const discarded = data.products.length - validProducts.length;
    const detailMsg =
      discarded > 0
        ? `Copia restaurada con éxito (${validProducts.length} válidos, ${discarded} descartados por formato inválido).`
        : `Copia de seguridad restaurada con éxito (${validProducts.length} alimentos).`;

    return {
      success: true,
      message: detailMsg,
      count: validProducts.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al leer la copia de seguridad: ${err?.message || "Archivo dañado"}`,
    };
  }
}
