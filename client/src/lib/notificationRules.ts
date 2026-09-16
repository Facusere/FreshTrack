export type AlertLeadDays = 1 | 3 | 7;
export type ProductStatus = "ok" | "soon" | "expired";
export type NotificationPreferences = {
  enabled: boolean;
  weeklySummary: boolean;
  summaryDay: "domingo" | "lunes";
  categoryLeadDays: Record<string, AlertLeadDays>;
};

export type NotificationItem = {
  id: number;
  name: string;
  category: string;
  expiry: string;
  days: number;
  status: ProductStatus;
};

export type NotificationGroup = {
  dateKey: string;
  dateLabel: string;
  products: NotificationItem[];
  title: string;
};

const PREFS_KEY = "freshtrack-notification-preferences-v1";

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
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null") as Partial<NotificationPreferences> | null;
    return { ...defaultNotificationPreferences, ...saved, categoryLeadDays: { ...defaultNotificationPreferences.categoryLeadDays, ...(saved?.categoryLeadDays || {}) } };
  } catch { return defaultNotificationPreferences; }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}

export function groupNotifications(items: NotificationItem[], preferences = defaultNotificationPreferences): NotificationGroup[] {
  if (!preferences.enabled) return [];
  const actionable = items.filter((item) => item.status === "expired" || item.days <= (preferences.categoryLeadDays[item.category] || 3));
  const grouped = new Map<string, NotificationItem[]>();
  actionable.forEach((item) => {
    const dateKey = item.expiry;
    grouped.set(dateKey, [...(grouped.get(dateKey) || []), item]);
  });
  return Array.from(grouped.entries()).sort((a, b) => Math.min(...a[1].map((item) => item.days)) - Math.min(...b[1].map((item) => item.days))).map(([dateKey, products]) => ({
    dateKey,
    dateLabel: dateKey,
    products,
    title: products.length === 1 ? `${products[0].name} vence ${dateKey}` : `${products.length} productos vencen ${dateKey}`,
  }));
}

export function buildWeeklySummary(items: NotificationItem[], preferences = defaultNotificationPreferences) {
  const groups = groupNotifications(items, preferences);
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
