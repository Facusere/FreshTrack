import { useState } from "react";
import { Bell, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Product } from "@/types/product";
import {
  buildWeeklySummary,
  defaultNotificationPreferences,
  NotificationPreferences,
} from "@/lib/notificationRules";
import {
  getNotificationPermission,
  notifyExpiringProducts,
  requestNotificationPermission,
} from "@/lib/pwaAndNotifications";

export interface NotificationSettingsModalProps {
  onClose: () => void;
  products: Product[];
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
}

export function NotificationSettingsModal({
  onClose,
  products,
  preferences,
  onSave,
}: NotificationSettingsModalProps) {
  const [draft, setDraft] = useState(preferences);
  const [permission, setPermission] = useState(getNotificationPermission());
  const summary = buildWeeklySummary(products, draft);
  const categories = Object.keys(defaultNotificationPreferences.categoryLeadDays);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      toast.success("¡Notificaciones web habilitadas!", {
        description: "FreshTrack te avisará en tu sistema cuando un alimento esté a 1 o 2 días de vencer.",
      });
    } else {
      toast.error("Permiso no concedido en el navegador.");
    }
  };

  const handleTestNotification = async () => {
    const res = await notifyExpiringProducts(products, true);
    if (res.sent) {
      toast.success("Notificación emitida", {
        description: res.message || "Se emitió la alerta al sistema.",
      });
    } else {
      toast(res.message || "No se pudo emitir la alerta.", { icon: "🔔" });
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[580px] p-5">
        <DialogHeader>
          <DialogTitle>Notificaciones y Alertas Push</DialogTitle>
          <DialogDescription>Avisos automáticos a 1 o 2 días del vencimiento.</DialogDescription>
        </DialogHeader>

        {/* Browser Permission & Push Test banner */}
        <div className="mt-2 rounded-2xl border border-brand-border bg-brand-subtle/50 p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-brand-text">Alertas en el sistema / celular</p>
              <p className="text-xs text-content-muted">
                {permission === "granted"
                  ? "✓ Notificaciones del navegador autorizadas."
                  : permission === "denied"
                  ? "Notificaciones bloqueadas en el navegador."
                  : "Habilitá avisos para recibir notificaciones cuando algo esté por vencer."}
              </p>
            </div>
            {permission !== "granted" ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="shrink-0 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-focus"
              >
                <Bell size={14} /> Activar notificaciones
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestNotification}
                className="shrink-0 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-surface px-3.5 py-2.5 text-xs font-bold text-brand-text shadow-sm hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand-focus"
              >
                <Bell size={14} /> Probar aviso (1-2 días)
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            aria-label="Alertas agrupadas"
            onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
            className={`min-h-[44px] rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-focus ${
              draft.enabled ? "border-brand-border bg-brand-subtle/50" : "border-line bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">Alertas agrupadas</span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition ${draft.enabled ? "bg-status-ok-dot" : "bg-line-strong"}`}>
                <span
                  className={`block h-4 w-4 rounded-full bg-surface transition ${
                    draft.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-4 text-content-muted">
              Agrupa productos que vencen el mismo día en un solo aviso.
            </p>
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={draft.weeklySummary}
            aria-label="Resumen semanal"
            onClick={() => setDraft({ ...draft, weeklySummary: !draft.weeklySummary })}
            className={`min-h-[44px] rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-focus ${
              draft.weeklySummary ? "border-brand-border bg-brand-subtle/50" : "border-line bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">Resumen semanal</span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition ${draft.weeklySummary ? "bg-status-ok-dot" : "bg-line-strong"}`}>
                <span
                  className={`block h-4 w-4 rounded-full bg-surface transition ${
                    draft.weeklySummary ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-4 text-content-muted">
              Recibí un solo resumen con lo que deberías planificar.
            </p>
          </button>
        </div>

        <div className="mt-2 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-brand-text">Anticipación por categoría</p>
              <p className="mt-1 text-xs text-content-muted">Elegí cuándo avisarte antes del vencimiento.</p>
            </div>
            <CalendarDays size={18} className="text-brand" />
          </div>
          <div className="mt-3 divide-y divide-line-subtle">
            {categories.slice(0, 8).map((category) => (
              <div key={category} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-xs font-semibold text-content-body">{category}</span>
                <select
                  value={draft.categoryLeadDays[category] || 3}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      categoryLeadDays: {
                        ...draft.categoryLeadDays,
                        [category]: Number(e.target.value) as 1 | 3 | 7,
                      },
                    })
                  }
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold text-brand-text outline-none focus:ring-2 focus:ring-brand-focus"
                >
                  <option value="1">1 día antes</option>
                  <option value="3">3 días antes</option>
                  <option value="7">7 días antes</option>
                </select>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-content-muted">
            Mostrando las categorías más frecuentes. Las demás usan 3 días por defecto.
          </p>
        </div>

        <div className="mt-2 rounded-2xl bg-brand-subtle/50 p-4">
          <div className="flex items-center gap-2 text-brand">
            <Bell size={15} />
            <p className="text-xs font-bold">Vista previa de tu resumen</p>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-brand-text">{summary.title}</p>
          <p className="mt-1 text-xs leading-4 text-content-muted">{summary.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.groups.slice(0, 3).map((group) => (
              <span key={group.dateKey} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-brand-text border border-line">
                {group.dateLabel} · {group.products.length}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-line px-4 py-3 text-xs font-semibold text-content-muted hover:bg-surface-elevated"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white hover:bg-brand-hover"
          >
            Guardar preferencias
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
