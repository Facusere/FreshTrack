// PWA and Notification Management for FreshTrack

export type PWAInstallState = {
  isInstallable: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
};

let deferredInstallPrompt: any = null;
const installListeners: Array<(canInstall: boolean) => void> = [];

export function setupPWAInstallListeners() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach((listener) => listener(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
  });
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void) {
  installListeners.push(callback);
  callback(Boolean(deferredInstallPrompt));
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx >= 0) installListeners.splice(idx, 1);
  };
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false;
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return outcome === "accepted";
  } catch {
    return false;
  }
}

export type DetectedPlatform = "android" | "ios" | "windows" | "linux" | "macos" | "other";

export function detectUserPlatform(): DetectedPlatform {
  if (typeof window === "undefined" || !navigator) return "other";
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";

  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Win/i.test(platform) || /windows/i.test(ua)) return "windows";
  if (/Linux/i.test(platform) || /linux/i.test(ua)) return "linux";
  if (/Mac/i.test(platform) || /macintosh/i.test(ua)) return "macos";

  return "other";
}

export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    (typeof document !== "undefined" && document.referrer.includes("android-app://"))
  );
}

import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {},
      onOfflineReady() {},
      onRegisterError(error: any) {
        console.warn("Fallo al registrar ServiceWorker con Workbox:", error);
      },
    });
    return updateSW;
  } catch (err) {
    console.warn("ServiceWorker registration failed:", err);
    return null;
  }
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

import { todayISO } from "./dates";

const LAST_NOTIFICATION_DATE_KEY = "freshtrack-last-notification-date";

export function clearNotificationDailyLimit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LAST_NOTIFICATION_DATE_KEY);
    } catch {
      // ignore in environments without localStorage
    }
  }
}

export type ExpiringProductAlert = {
  name: string;
  days: number;
  category?: string;
  quantity?: string;
};

/**
 * Checks for products expiring in 1 or 2 days and issues a push/web notification.
 * @param products list of current products
 * @param force if true, bypasses once-per-day rate limit (e.g. for testing)
 */
export async function notifyExpiringProducts(
  products: ExpiringProductAlert[],
  force = false,
  today: Date = new Date()
): Promise<{ sent: boolean; message?: string }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { sent: false, message: "Las notificaciones no están soportadas en este navegador." };
  }

  if (Notification.permission !== "granted") {
    return { sent: false, message: "Permiso de notificaciones no concedido." };
  }

  const todayStr = todayISO(today);
  const lastNotified = localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);

  if (!force && lastNotified === todayStr) {
    return { sent: false, message: "Ya se verificaron los avisos de hoy." };
  }

  // Target products expiring in 1 or 2 days (or today: 0 days)
  const urgent = products.filter((p) => p.days >= 0 && p.days <= 2);

  if (urgent.length === 0) {
    return { sent: false, message: "No hay productos a 1 o 2 días de vencer." };
  }

  let title = "";
  let body = "";

  if (urgent.length === 1) {
    const p = urgent[0];
    const dayText = p.days === 0 ? "¡vence hoy!" : p.days === 1 ? "vence mañana" : "vence en 2 días";
    title = `⚠️ ${p.name} ${dayText}`;
    body = `Aprovechá tu ${p.name} (${p.quantity || "1 unidad"}) antes de que se eche a perder.`;
  } else {
    const names = urgent.slice(0, 2).map((p) => p.name).join(", ");
    const remaining = urgent.length > 2 ? ` y ${urgent.length - 2} más` : "";
    title = `⚠️ ${urgent.length} productos por vencer en 1-2 días`;
    body = `Tenés ${names}${remaining} próximos a caducar. ¡Revisá tu despensa para aprovecharlos hoy!`;
  }

  // Try showing through ServiceWorker registration first for background reliability
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        const options: any = {
          body,
          icon: "/icon.svg",
          badge: "/icon.svg",
          vibrate: [200, 100, 200],
          data: { url: "/#module-pantry" },
          actions: [
            { action: "open", title: "Ver despensa" },
            { action: "dismiss", title: "Cerrar" },
          ],
        };
        await reg.showNotification(title, options);
        localStorage.setItem(LAST_NOTIFICATION_DATE_KEY, todayStr);
        return { sent: true, message: title };
      }
    } catch {
      // Fallback to standard Notification
    }
  }

  // Fallback to standard web notification
  try {
    new Notification(title, {
      body,
      icon: "/icon.svg",
    });
    localStorage.setItem(LAST_NOTIFICATION_DATE_KEY, todayStr);
    return { sent: true, message: title };
  } catch (err) {
    console.error("Error creating Notification:", err);
    return { sent: false, message: "Error al emitir la notificación." };
  }
}
