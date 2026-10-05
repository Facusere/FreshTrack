import { PRODUCTS_STORAGE_KEY, CONSUMPTION_HISTORY_KEY, loadJSON, saveJSON } from "./storage";
import { StoredProduct, Product } from "@/types/product";

const SHOPPING_LIST_KEY = "freshtrack-shopping-list-v1";

export interface FreshTrackBackup {
  version: number;
  exportedAt: string;
  products: StoredProduct[];
  consumptionHistory: any[];
  shoppingList: any[];
  theme?: string;
}

/**
 * Downloads a complete FreshTrack backup file as formatted JSON.
 */
export function exportBackupJSON(products: StoredProduct[]): void {
  const history = loadJSON<any[]>(CONSUMPTION_HISTORY_KEY, []);
  const shopping = loadJSON<any[]>(SHOPPING_LIST_KEY, []);
  const theme = typeof localStorage !== "undefined" ? localStorage.getItem("freshtrack-theme") || "light" : "light";

  const backup: FreshTrackBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    consumptionHistory: history,
    shoppingList: shopping,
    theme,
  };

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

    // Save restored products
    saveJSON(PRODUCTS_STORAGE_KEY, data.products);

    // Save history if available
    if (Array.isArray(data.consumptionHistory)) {
      saveJSON(CONSUMPTION_HISTORY_KEY, data.consumptionHistory);
    }

    // Save shopping list if available
    if (Array.isArray(data.shoppingList)) {
      saveJSON(SHOPPING_LIST_KEY, data.shoppingList);
    }

    return {
      success: true,
      message: `Copia de seguridad restaurada con éxito (${data.products.length} alimentos).`,
      count: data.products.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al leer la copia de seguridad: ${err?.message || "Archivo dañado"}`,
    };
  }
}
