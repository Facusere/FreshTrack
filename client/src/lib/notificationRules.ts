import { formatExpiryDisplay } from "./dates";
import { Product } from "@/types/product";
import { loadJSON, saveJSON } from "./storage";

export type AlertLeadDays = 1 | 3 | 7;

export type NotificationPreferences = {
  enabled: boolean;
  weeklySummary: boolean;
  summaryDay: "domingo" | "lunes";
  categoryLeadDays: Record<string, AlertLeadDays>;
};

export type NotificationGroup = {
  dateKey: string;
  dateLabel: string;
  products: Product[];
  title: string;
};

export const NOTIFICATION_PREFS_KEY = "freshtrack-notification-preferences-v1";
const PREFS_KEY = NOTIFICATION_PREFS_KEY;

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  weeklySummary: true,
  summaryDay: "domingo",
  categoryLeadDays: {
    "Lácteos": 3,
    "Fiambres y embutidos": 3,
    "Carnes": 1,
    "Pescados y mariscos": 1,
    "Verduras frescas": 3,
    "Frutas frescas": 3,
    "Panadería": 1,
    "Almacén seco": 7,
    "Enlatados y conservas": 7,
    "Congelados": 7,
    "Salsas y aderezos": 7,
    "Snacks y galletitas": 7,
    "Bebidas": 7,
    "Café, té y desayuno": 7,
    "Refrigerados preparados": 1,
  },
};

export function loadNotificationPreferences(): NotificationPreferences {
  const saved = loadJSON<Partial<NotificationPreferences> | null>(PREFS_KEY, null);
  return {
    ...defaultNotificationPreferences,
    ...saved,
    categoryLeadDays: {
      ...defaultNotificationPreferences.categoryLeadDays,
      ...(saved?.categoryLeadDays || {}),
    },
  };
}

export function saveNotificationPreferences(preferences: NotificationPreferences): boolean {
  return saveJSON(PREFS_KEY, preferences);
}

export function groupNotifications(
  items: Product[],
  preferences = defaultNotificationPreferences,
  today: Date = new Date()
): NotificationGroup[] {
  const actionable = items.filter((item) => {
    if (item.status === "expired") return true;
    if (item.state === "abierto" && item.days <= 2) return true;
    const leadDays = preferences.categoryLeadDays[item.category] || 3;
    return item.days <= leadDays;
  });

  const grouped = new Map<string, Product[]>();
  actionable.forEach((item) => {
    const dateKey = item.expiryDate;
    grouped.set(dateKey, [...(grouped.get(dateKey) || []), item]);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, products]) => {
      const dateLabel = formatExpiryDisplay(dateKey, today);
      return {
        dateKey,
        dateLabel,
        products,
        title: products.length === 1 ? `${products[0].name} vence ${dateLabel}` : `${products.length} productos vencen ${dateLabel}`,
      };
    });
}

export function buildWeeklySummary(
  items: Product[],
  preferences = defaultNotificationPreferences,
  today: Date = new Date()
) {
  const groups = groupNotifications(items, preferences, today);
  const products = groups.flatMap((group) => group.products);
  return {
    groups,
    products,
    title: products.length ? `${products.length} productos para planificar esta semana` : "Tu semana está despejada",
    description: products.length ? "FreshTrack los agrupó por día para que decidas qué consumir sin recibir avisos sueltos." : "No hay vencimientos próximos dentro de tus reglas actuales.",
  };
}

export function getCategoryLeadDays(category: string, preferences = defaultNotificationPreferences): AlertLeadDays {
  return preferences.categoryLeadDays[category] || 3;
}
