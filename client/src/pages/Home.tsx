import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CircleHelp,
  Home as HomeIcon,
  Leaf,
  Menu,
  PackageOpen,
  Pencil,
  Route,
  ScanLine,
  Search,
  Settings2,
  ShoppingCart,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { DateLabel, getLearningRule, labelForDisplay, saveLearningCorrection } from "@/lib/dateRecognition";
import { estimateShelfLife, getCatalogSize, ShelfLifeState, saveShelfLifeCorrection } from "@/lib/shelfLifeCatalog";
import { buildWeeklySummary, defaultNotificationPreferences, groupNotifications, loadNotificationPreferences, NotificationPreferences, saveNotificationPreferences } from "@/lib/notificationRules";
import {
  getRecipeDetails,
  RecipeSuggestion,
  searchRecipesByExpiring,
  getRecipeFallbackImage,
  isGlutenFreeEstimated,
} from "@/lib/recipeApi";
import { ImpactStats, loadImpactStats, recordImpact, reverseImpact } from "@/lib/impactStats";
import {
  ConsumptionPlan,
  ConsumptionRecord,
  SelectedDeduction,
  planRecipeConsumption,
  applyConsumptionPlan,
  undoConsumptionHistory,
} from "@/lib/inventoryConsumption";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsumptionConfirmDialog } from "@/components/ConsumptionConfirmDialog";
import { ScanModal } from "@/components/ScanModal";
import {
  HeroSection,
  StatsSection,
  ReportsSection,
  PantrySection,
  ShoppingSection,
  RecipesSection,
  MobileBottomNav,
  MiniStatus,
} from "@/components/home";
import { recordExpiredItem } from "@/lib/reportsData";
import {
  getNotificationPermission,
  notifyExpiringProducts,
  promptPWAInstall,
  requestNotificationPermission,
  subscribeToInstallPrompt,
} from "@/lib/pwaAndNotifications";
import { loadShoppingList, saveShoppingList, ShoppingItem } from "@/lib/shoppingList";

import { Product, StoredProduct, ProductStatus, deriveProduct } from "@/types/product";
import { ALL_CATEGORIES } from "@/lib/categories";
import { addDaysISO, daysUntil, formatRelativeDays, SOON_THRESHOLD_DAYS, useToday } from "@/lib/dates";
import {
  loadStoredProducts,
  saveStoredProducts,
  loadConsumptionHistory,
  saveConsumptionHistory,
  loadLastScan,
  LastScanInfo,
} from "@/lib/storage";

type RecipeFilter = "all" | "vegetarian" | "glutenFree" | "quick";

function recipeMatchesFilter(recipe: RecipeSuggestion, filter: RecipeFilter) {
  if (filter === "all") return true;
  if (filter === "glutenFree") {
    return recipe.isGlutenFreeEstimated !== undefined
      ? recipe.isGlutenFreeEstimated
      : isGlutenFreeEstimated(recipe.ingredients);
  }
  const text = `${recipe.title} ${recipe.matchedIngredients.join(" ")} ${(recipe.ingredients || []).map((item) => item.name).join(" ")}`;
  if (filter === "vegetarian") return !/(chicken|pollo|beef|carne|pork|cerdo|bacon|salmon|fish|pescado|tuna|atún|meat)/i.test(text);
  return /(quick|salad|ensalada|omelette|tortilla|sandwich|wrap|pasta|salteado)/i.test(text);
}

export function buildDemoProducts(today: Date = new Date()): StoredProduct[] {
  return [
    { id: 1, name: "Yogur natural", category: "Lácteos", expiryDate: addDaysISO(3, today), quantity: "4 unidades", icon: "🥣", estimated: true, dateLabel: "vencimiento" },
    { id: 2, name: "Espinaca fresca", category: "Verduras frescas", expiryDate: addDaysISO(4, today), quantity: "1 atado", icon: "🥬" },
    { id: 3, name: "Pechuga de pollo", category: "Carnes", expiryDate: addDaysISO(6, today), quantity: "2 unidades", icon: "🍗" },
    { id: 4, name: "Pan de molde", category: "Panadería", expiryDate: addDaysISO(9, today), quantity: "1 paquete", icon: "🍞" },
    { id: 5, name: "Tomates cherry", category: "Verduras frescas", expiryDate: addDaysISO(1, today), quantity: "1 bandeja", icon: "🍅" },
    { id: 6, name: "Leche entera", category: "Lácteos", expiryDate: addDaysISO(-1, today), quantity: "2 litros", icon: "🥛" },
    { id: 7, name: "Pasta seca", category: "Almacén seco", expiryDate: addDaysISO(331, today), quantity: "2 paquetes", icon: "🍝" },
  ];
}

function formatToday() {
  const now = new Date();
  const formatted = now.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function detectProductIcon(name: string, category: string): string {
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const c = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (n.includes("leche") || n.includes("queso") || n.includes("crema") || n.includes("manteca")) return "🥛";
  if (n.includes("yogur")) return "🥣";
  if (n.includes("pollo") || n.includes("carne") || n.includes("asado") || n.includes("bife") || n.includes("milanesa")) return "🍗";
  if (n.includes("pescado") || n.includes("merluza") || n.includes("atun") || n.includes("salmon")) return "🐟";
  if (n.includes("pan") || n.includes("tostada") || n.includes("factura") || n.includes("medialuna") || n.includes("gallet")) return "🍞";
  if (n.includes("tomate")) return "🍅";
  if (n.includes("espinaca") || n.includes("acelga") || n.includes("lechuga") || n.includes("rucula")) return "🥬";
  if (n.includes("manzana")) return "🍎";
  if (n.includes("banana")) return "🍌";
  if (n.includes("palta") || n.includes("aguacate")) return "🥑";
  if (n.includes("papa") || n.includes("patata") || n.includes("pure")) return "🥔";
  if (n.includes("huevo")) return "🥚";
  if (n.includes("arroz")) return "🍚";
  if (n.includes("pasta") || n.includes("fideo") || n.includes("ravioles") || n.includes("noquis")) return "🍝";
  if (c.includes("bebida")) return "🧃";
  if (c.includes("cafe") || c.includes("te") || c.includes("mate")) return "☕";
  if (c.includes("fruta")) return "🍎";
  if (c.includes("verdura")) return "🥬";
  if (c.includes("carne")) return "🥩";
  if (c.includes("enlatado")) return "🥫";
  return "📦";
}

function inferLocation(category: string): string {
  const cat = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (cat.includes("lacteo") || cat.includes("fiambre") || cat.includes("carne") || cat.includes("pescado") || cat.includes("refrigerado")) {
    return "Heladera";
  }
  if (cat.includes("verdura") || cat.includes("fruta")) {
    return "Cajón verduras";
  }
  if (cat.includes("congelado")) {
    return "Freezer";
  }
  return "Alacena";
}

function NotificationSettingsModal({
  onClose,
  products,
  preferences,
  onSave,
}: {
  onClose: () => void;
  products: Product[];
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
}) {
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


function AddProductModal({
  onClose,
  onAdd,
  initialProduct,
  onCorrection,
  onSuggest,
  today = new Date(),
}: {
  onClose: () => void;
  onAdd: (product: StoredProduct) => void;
  initialProduct?: Product;
  onCorrection?: (product: Product, nextLabel: DateLabel, nextCategory: string, nextExpiryDate: string) => void;
  onSuggest?: (productName: string, category: string, state: ShelfLifeState, days: number) => void;
  today?: Date;
}) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [category, setCategory] = useState(initialProduct?.category || "Almacén seco");
  const [quantity, setQuantity] = useState(initialProduct?.quantity || "1 unidad");
  const [expiryDate, setExpiryDate] = useState(() => initialProduct?.expiryDate || addDaysISO(7, today));
  const [isCustomExpiry, setIsCustomExpiry] = useState(false);
  const [dateLabel, setDateLabel] = useState<DateLabel>(initialProduct?.dateLabel || "vencimiento");
  const [shelfState, setShelfState] = useState<ShelfLifeState>("cerrado");
  const [shelfDays, setShelfDays] = useState(() => {
    if (initialProduct?.expiryDate) {
      return Math.max(1, daysUntil(initialProduct.expiryDate, today));
    }
    return estimateShelfLife(initialProduct?.name || "", "cerrado", initialProduct?.category)?.days || 7;
  });
  const isEditing = Boolean(initialProduct);

  const shelfEstimate = useMemo(() => {
    return name.trim() ? estimateShelfLife(name, shelfState, category) : undefined;
  }, [name, shelfState, category]);

  const handleNameChange = (val: string) => {
    setName(val);
    const estimate = estimateShelfLife(val, shelfState, category);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    const estimate = estimateShelfLife(name, shelfState, val);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleShelfStateChange = (val: ShelfLifeState) => {
    setShelfState(val);
    const estimate = estimateShelfLife(name, val, category);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleShelfDaysChange = (days: number) => {
    const validDays = Number(days) || 1;
    setShelfDays(validDays);
    setExpiryDate(addDaysISO(validDays, today));
    setIsCustomExpiry(false);
  };

  const handleExpiryDateChange = (val: string) => {
    setExpiryDate(val);
    setIsCustomExpiry(true);
    const diff = daysUntil(val, today);
    setShelfDays(Math.max(1, diff));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (initialProduct && onCorrection) {
      onCorrection(initialProduct, dateLabel, category, expiryDate);
    } else {
      onAdd({
        id: Date.now(),
        name: name.trim(),
        category,
        expiryDate,
        quantity: quantity.trim() || "1 unidad",
        icon: detectProductIcon(name, category),
        dateLabel,
        location: inferLocation(category),
      });
    }
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[480px] p-5">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Corregir producto" : "Agregar producto"}</DialogTitle>
          <DialogDescription>Una carga rápida, sin vueltas.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Producto</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Queso cremoso"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none transition placeholder:text-content-muted/60 focus:border-brand-focus focus:ring-2 focus:ring-brand-subtle"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Categoría</span>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Cantidad</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej. 2 unidades, 500g"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Fecha de vencimiento</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">¿Qué tipo de fecha es?</span>
              <select
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value as DateLabel)}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              >
                <option value="vencimiento">Fecha de vencimiento</option>
                <option value="elaboración">Fecha de elaboración</option>
                <option value="consumo preferente">Consumo preferente</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-line bg-brand-subtle/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-brand-text">Vida útil estimada</p>
                <p className="mt-0.5 text-xs text-content-body font-medium">
                  {shelfEstimate?.label || (shelfState === "abierto" ? "Calculado para envase abierto." : "Calculado según guías de conservación.")}
                </p>
              </div>
              <select
                aria-label="Estado del envase"
                value={shelfState}
                onChange={(e) => handleShelfStateChange(e.target.value as ShelfLifeState)}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold text-brand-text"
              >
                <option value="cerrado">Cerrado</option>
                <option value="abierto">Abierto</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="1"
                aria-label="Días estimados de vida útil"
                value={shelfDays}
                onChange={(e) => handleShelfDaysChange(Number(e.target.value))}
                className="w-20 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-semibold text-content-body outline-none focus:border-brand-focus"
              />
              <span className="text-xs text-content-body">días estimados</span>
              <button
                type="button"
                onClick={() => onSuggest?.(name, category, shelfState, shelfDays)}
                className="ml-auto min-h-[44px] rounded-lg bg-brand-subtle px-3 py-2 text-xs font-bold text-brand-text hover:bg-brand-border/40"
              >
                Recordar mi ajuste
              </button>
            </div>
          </div>
          {isEditing && (
            <p className="rounded-xl bg-brand-subtle/50 px-3 py-2 text-xs leading-4 text-brand-text">
              Tu corrección se guardará como regla para futuras lecturas de {name}.
            </p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl border border-line px-4 py-3 text-xs font-semibold text-content-body hover:bg-surface-elevated"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={handleSave}
            className="flex-1 min-h-[44px] rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEditing ? "Guardar corrección" : "Guardar producto"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const today = useToday();
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>(() => loadStoredProducts(new Date()) ?? []);
  const [lastScan, setLastScan] = useState<LastScanInfo | null>(() => loadLastScan());
  const products = useMemo(() => storedProducts.map((p) => deriveProduct(p, today)), [storedProducts, today]);
  const [activeNav, setActiveNav] = useState("Resumen");
  const [filter, setFilter] = useState<"all" | ProductStatus>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"expiry-asc" | "expiry-desc" | "name-asc" | "name-desc" | "category">("expiry-asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modal, setModal] = useState<"scan" | "add" | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [notificationModal, setNotificationModal] = useState(false);
  const [pantryView, setPantryView] = useState<"list" | "calendar">("list");
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesWarning, setRecipesWarning] = useState<string | null>(null);
  const [recipesInfo, setRecipesInfo] = useState<string | null>(null);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [impact, setImpact] = useState<ImpactStats>(() => loadImpactStats());
  const [recipeDetail, setRecipeDetail] = useState<RecipeSuggestion | null>(null);
  const [recipeDetailLoading, setRecipeDetailLoading] = useState(false);
  const [consumptionSuccess, setConsumptionSuccess] = useState<string[]>([]);
  const [consumptionHistory, setConsumptionHistory] = useState<ConsumptionRecord[]>(() => loadConsumptionHistory());
  const [consumptionPlanToConfirm, setConsumptionPlanToConfirm] = useState<{ recipe: RecipeSuggestion; plan: ConsumptionPlan } | null>(null);

  useEffect(() => {
    saveConsumptionHistory(consumptionHistory);
  }, [consumptionHistory]);

  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [recipeLimit, setRecipeLimit] = useState(3);
  const [showAllPantry, setShowAllPantry] = useState(false);

  // Smart shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() => loadShoppingList());
  useEffect(() => {
    saveShoppingList(shoppingList);
  }, [shoppingList]);

  // PWA install state
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  useEffect(() => {
    return subscribeToInstallPrompt(setCanInstallPWA);
  }, []);

  // Automatic background notification check for products expiring in 1 or 2 days
  useEffect(() => {
    if (notificationPreferences.enabled && getNotificationPermission() === "granted") {
      notifyExpiringProducts(products, false);
    }
  }, [products, notificationPreferences.enabled]);

  const normalizeSearch = (value: string) =>
    value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filteredProducts = useMemo(() => {
    const term = normalizeSearch(search);
    const result = products.filter((product) => {
      const matchesFilter = filter === "all" || product.status === filter;
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      if (!matchesFilter || !matchesCategory) return false;
      if (!term) return true;
      return (
        normalizeSearch(product.name).includes(term) ||
        normalizeSearch(product.category).includes(term)
      );
    });

    result.sort((a, b) => {
      if (sortBy === "expiry-asc") return a.days - b.days;
      if (sortBy === "expiry-desc") return b.days - a.days;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "es");
      if (sortBy === "name-desc") return b.name.localeCompare(a.name, "es");
      if (sortBy === "category") return a.category.localeCompare(b.category, "es");
      return 0;
    });

    return result;
  }, [filter, products, search, categoryFilter, sortBy]);

  const soonCount = products.filter((p) => p.status === "soon").length;
  const expiredCount = products.filter((p) => p.status === "expired").length;
  const okCount = products.filter((p) => p.status === "ok").length;
  const totalTracked = products.length;
  const okPercent = totalTracked > 0 ? Math.round((okCount / totalTracked) * 100) : 100;
  const soonPercent = totalTracked > 0 ? Math.round((soonCount / totalTracked) * 100) : 0;
  const pOk = okPercent;
  const pSoon = Math.min(100, pOk + soonPercent);

  const suggestedRoute = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.days - b.days).slice(0, 3);
    return sorted.map((prod, idx) => ({
      number: String(idx + 1),
      name: prod.name,
      place: prod.location || inferLocation(prod.category),
      product: prod,
    }));
  }, [products]);

  const pendingShoppingCount = shoppingList.filter((item) => !item.completed).length;

  const currentNavItems = [
    { label: "Resumen", icon: HomeIcon },
    { label: "Mi despensa", icon: PackageOpen, count: products.length > 0 ? String(products.length) : undefined },
    { label: "Lista de compras", icon: ShoppingCart, count: pendingShoppingCount > 0 ? String(pendingShoppingCount) : undefined },
    { label: "Recorrida", icon: Route, count: suggestedRoute.length > 0 ? String(suggestedRoute.length) : undefined },
    { label: "Reportes", icon: BarChart3 },
  ];

  const notificationGroups = groupNotifications(products, notificationPreferences);
  const visibleRecipes = recipes.filter((recipe) => recipeMatchesFilter(recipe, recipeFilter));
  const shownRecipes = visibleRecipes.slice(0, recipeLimit);

  useEffect(() => { saveStoredProducts(storedProducts); }, [storedProducts]);

  const priorityKey = useMemo(() => {
    const valid = products.filter((p) => p.status !== "expired" && p.days > 0);
    let prio = valid.filter((p) => p.status === "soon").sort((a, b) => a.days - b.days);
    if (prio.length === 0) {
      prio = valid.filter((p) => p.days <= 7).sort((a, b) => a.days - b.days);
    }
    const expiredCount = products.filter((p) => p.status === "expired" || p.days <= 0).length;
    return `${expiredCount}|${prio.slice(0, 3).map((p) => `${p.name}:${p.days}`).join(",")}`;
  }, [products]);

  useEffect(() => {
    const controller = new AbortController();
    setRecipesLoading(true);
    searchRecipesByExpiring(products, controller.signal)
      .then((result) => {
        setRecipes(result.recipes);
        setRecipesWarning(result.warning || null);
        setRecipesInfo(result.info || null);
        setRecipesError(result.error || null);
      })
      .catch(() => {
        // silently ignore abort
      })
      .finally(() => setRecipesLoading(false));
    return () => controller.abort();
  }, [priorityKey]);

  useEffect(() => { setRecipeLimit(3); }, [recipeFilter, products]);

  const openRecipeDetail = async (recipe: RecipeSuggestion) => {
    setRecipeDetailLoading(true);
    try { setRecipeDetail(await getRecipeDetails(recipe)); } catch { setRecipeDetail(recipe); toast.error("No pudimos cargar el detalle", { description: "La receta sigue disponible con la información básica." }); }
    finally { setRecipeDetailLoading(false); }
  };

  const initiateRecipeConsumption = async (recipe: RecipeSuggestion) => {
    let fullRecipe = recipe;
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      try {
        fullRecipe = await getRecipeDetails(recipe);
      } catch {
        fullRecipe = recipe;
      }
    }

    const recipeIngredients =
      fullRecipe.ingredients && fullRecipe.ingredients.length > 0
        ? fullRecipe.ingredients.map((ing) => ({ name: ing.name, measure: ing.measure }))
        : fullRecipe.matchedIngredients.map((name) => ({ name, measure: "1 unidad" }));

    const plan = planRecipeConsumption(storedProducts, recipeIngredients);
    setConsumptionPlanToConfirm({ recipe: fullRecipe, plan });
  };

  const handleConfirmConsumption = (selectedDeductions: SelectedDeduction[]) => {
    if (!consumptionPlanToConfirm) return;
    const recipe = consumptionPlanToConfirm.recipe;
    const before = storedProducts;

    const result = applyConsumptionPlan(storedProducts, selectedDeductions);
    setStoredProducts(result.remaining);

    const delta = { kg: 0.4, money: 1200, meals: 1 };
    setImpact(recordImpact(delta));

    const appliedSummary = result.applied.map((a) => {
      const item = before.find((it) => it.id === a.itemId);
      return item ? `${item.name} (${a.deducted})` : a.deducted;
    });

    const newRecord: ConsumptionRecord = {
      id: Date.now(),
      title: recipe.title,
      ingredients: appliedSummary,
      before,
      applied: result.applied,
      delta,
      createdAt: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    };

    setConsumptionHistory((current) => [...current.slice(-4), newRecord]);
    setConsumptionSuccess(appliedSummary);
    window.setTimeout(() => setConsumptionSuccess([]), 2400);

    toast.success("¡Buen aprovechamiento!", {
      description: `${appliedSummary.join(", ") || "Ingredientes"} se descontó de tu despensa.`,
    });

    if (result.depletedItemNames.length > 0) {
      toast("Productos terminados", {
        description: `${result.depletedItemNames.join(", ")} se terminó y salió de tu despensa.`,
      });
    }

    setConsumptionPlanToConfirm(null);
  };

  const undoConsumption = (recordId: number) => {
    const { rebuiltProducts, rebuiltHistory } = undoConsumptionHistory(consumptionHistory, recordId);
    const undoneRecord = consumptionHistory.find((r) => r.id === recordId);
    if (!undoneRecord) return;

    setStoredProducts(rebuiltProducts);
    setImpact(reverseImpact(undoneRecord.delta));
    setConsumptionHistory(rebuiltHistory);
    setConsumptionSuccess([]);
    toast("Consumo deshecho", { description: `Se revirtió “${undoneRecord.title}” sin afectar los consumos posteriores.` });
  };

  const addProducts = (newProducts: StoredProduct[]) => {
    setStoredProducts((current) => [...newProducts, ...current]);
    setLastScan(loadLastScan());
    toast.success(`${newProducts.length} productos agregados`, { description: "Las fechas estimadas quedaron listas para revisar." });
  };

  const addProduct = (newProduct: StoredProduct) => {
    const learning = getLearningRule(newProduct.name, newProduct.category);
    const expiryDate = learning?.shelfLifeDays
      ? addDaysISO(learning.shelfLifeDays, today)
      : newProduct.expiryDate;
    setStoredProducts((current) => [
      {
        ...newProduct,
        expiryDate,
        dateLabel: learning?.preferredLabel || newProduct.dateLabel,
      },
      ...current,
    ]);
    toast.success(`${newProduct.name} agregado a tu despensa`, { description: learning ? "Aplicamos una regla aprendida de usos anteriores." : "La fecha queda lista para revisar." });
  };

  const suggestShelfLife = (productName: string, _category: string, state: ShelfLifeState, days: number) => {
    if (!productName.trim() || !Number.isFinite(days) || days < 1) {
      toast.error("Completá un producto y una cantidad válida de días");
      return;
    }
    const openDays = state === "abierto" ? days : Math.max(1, Math.round(days / 2));
    const closedDays = state === "cerrado" ? days : days * 2;
    saveShelfLifeCorrection(productName.trim(), closedDays, openDays);
    toast.success("Ajuste guardado", {
      description: `Usaremos ${days} días la próxima vez que agregues “${productName.trim()}”.`,
    });
  };

  const correctProduct = (product: Product, nextLabel: DateLabel, nextCategory: string, nextExpiryDate: string) => {
    saveLearningCorrection({ productKey: product.name, category: nextCategory, preferredLabel: nextLabel });
    setStoredProducts((current) => current.map((item) => item.id === product.id ? { ...item, category: nextCategory, expiryDate: nextExpiryDate, dateLabel: nextLabel, corrected: true } : item));
    setSelectedProduct(null);
    setEditingProduct(null);
    toast.success("Corrección aprendida", { description: `La próxima lectura priorizará “${labelForDisplay(nextLabel)}” para ${product.name}.` });
  };

  const savePreferences = (next: NotificationPreferences) => {
    saveNotificationPreferences(next);
    setNotificationPreferences(next);
    toast.success("Preferencias guardadas", { description: "FreshTrack va a agrupar tus avisos según estas reglas." });
  };

  const removeSelected = () => {
    if (!selectedProduct) return;
    if (selectedProduct.status === "expired" || selectedProduct.days <= 0) {
      recordExpiredItem(selectedProduct.name, selectedProduct.category);
    }
    setStoredProducts((current) => current.filter((product) => product.id !== selectedProduct.id));
    toast(`${selectedProduct.name} eliminado`, { icon: <Trash2 size={15} /> });
    setSelectedProduct(null);
  };

  const navigateToModule = (label: string) => {
    setActiveNav(label);
    if (label === "Mi despensa") setPantryView("calendar");
    const targets: Record<string, string> = {
      Resumen: "module-summary",
      "Mi despensa": "module-pantry",
      "Lista de compras": "module-shopping",
      Recorrida: "module-route",
      Reportes: "module-reports",
    };
    document.getElementById(targets[label] || "module-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-surface-subtle text-content-heading">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-lime"
      >
        Saltar al contenido principal
      </a>
      {consumptionSuccess.length > 0 && (
        <div role="status" className="fixed bottom-5 right-5 z-[60] flex max-w-[340px] items-center gap-3 rounded-2xl border border-status-ok-border bg-status-ok-bg px-4 py-3 text-status-ok-text shadow-[0_16px_40px_rgba(31,73,58,0.18)] animate-[freshtrack-success_240ms_cubic-bezier(0.23,1,0.32,1)]">
          <span className="flex h-8 w-8 animate-[freshtrack-pop_420ms_cubic-bezier(0.23,1,0.32,1)] items-center justify-center rounded-full bg-status-ok-dot text-white">
            <Check size={17} strokeWidth={3} />
          </span>
          <div>
            <p className="text-xs font-bold">Ingredientes aprovechados</p>
            <p className="mt-0.5 text-xs">{consumptionSuccess.join(", ")} salió de tu despensa.</p>
          </div>
        </div>
      )}
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-content px-4 py-5 text-brand-subtle md:flex">
          <div className="flex items-center gap-2.5 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-accent-lime text-accent-lime-fg">
              <Leaf size={20} strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-serif text-[21px] font-bold leading-none tracking-[-0.03em]">freshtrack</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.17em] text-brand-subtle/80">menos desperdicio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModal("scan")}
            className="mt-9 flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent-lime px-3 py-3 text-xs font-bold text-accent-lime-fg shadow-[0_8px_18px_rgba(217,233,130,0.12)] transition hover:opacity-90 active:scale-[0.98]"
          >
            <ScanLine size={16} /> Escanear compra
          </button>
          {canInstallPWA && (
            <button
              type="button"
              onClick={() => promptPWAInstall()}
              className="mt-2.5 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand-border/40 bg-brand px-3 py-2 text-xs font-bold text-brand-subtle transition hover:bg-brand-hover"
            >
              <Smartphone size={14} /> Instalar app en tu celu
            </button>
          )}
          <p className="mb-2 mt-9 px-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-subtle/70">Tu espacio</p>
          <nav className="space-y-1">
            {currentNavItems.map(({ label, icon: Icon, count }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigateToModule(label)}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                  activeNav === label ? "bg-brand text-white" : "text-brand-subtle/80 hover:bg-brand/50 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} strokeWidth={1.8} />
                  {label}
                </span>
                {count && (
                  <span className={`rounded-md px-1.5 py-0.5 text-xs ${activeNav === label ? "bg-brand-hover text-white" : "bg-brand/60 text-brand-subtle"}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <p className="mb-2 mt-8 px-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-subtle/70">Cuenta</p>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setNotificationModal(true)}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-subtle/80 transition hover:bg-brand/50 hover:text-white"
            >
              <Bell size={16} strokeWidth={1.8} />Notificaciones
              {notificationGroups.length > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-lime" />
                  <span className="text-xs font-bold text-accent-lime">{notificationGroups.length}</span>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setNotificationModal(true)}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-subtle/80 transition hover:bg-brand/50 hover:text-white"
            >
              <Settings2 size={16} strokeWidth={1.8} />Configuración
            </button>
          </nav>
          <div className="mt-auto rounded-2xl bg-brand/40 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-lime text-xs font-extrabold text-accent-lime-fg">
                FT
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">Despensa local</p>
                <p className="text-xs text-brand-subtle/80">Datos en tu dispositivo</p>
              </div>
            </div>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 flex-1 md:ml-[244px] pb-24 md:pb-0">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-line bg-surface-subtle/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-content-body hover:bg-surface-elevated md:hidden"
                onClick={() => setMobileNav(!mobileNav)}
                aria-label="Menú principal"
              >
                <Menu size={19} />
              </button>
              <div className="md:hidden">
                <p className="font-serif text-xl font-bold tracking-[-0.04em] text-content">freshtrack</p>
              </div>
              <div className="hidden items-center gap-2 text-xs text-content-muted md:flex">
                <CalendarDays size={14} />{formatToday()}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {canInstallPWA && (
                <button
                  type="button"
                  onClick={() => promptPWAInstall()}
                  className="hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-brand-border bg-brand-subtle px-3 py-1.5 text-xs font-bold text-brand-text shadow-sm transition hover:bg-brand-subtle/80 sm:flex"
                >
                  <Smartphone size={14} /> Instalar PWA
                </button>
              )}
              <div className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-content-muted sm:flex">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en tu despensa"
                  className="w-[150px] bg-transparent text-xs outline-none placeholder:text-content-muted/60"
                />
              </div>
              <button
                type="button"
                aria-label="Buscar"
                onClick={() => document.querySelector<HTMLInputElement>("input[placeholder='Buscar en tu despensa']")?.focus()}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface p-2.5 text-content-muted sm:hidden"
              >
                <Search size={16} />
              </button>
              <button
                type="button"
                aria-label="Ayuda"
                onClick={() => toast("¿Necesitás ayuda?", { description: "Escaneá un ticket y FreshTrack hace el resto." })}
                className="hidden h-11 w-11 items-center justify-center rounded-xl text-content-muted transition hover:bg-surface-elevated sm:flex"
              >
                <CircleHelp size={17} />
              </button>
              <button
                type="button"
                aria-label="Notificaciones"
                onClick={() => setNotificationModal(true)}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl text-content-muted transition hover:bg-surface-elevated"
              >
                <Bell size={17} />
                {notificationGroups.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-status-soon-dot" />}
              </button>
              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-accent-lime text-xs font-extrabold text-accent-lime-fg sm:flex" title="Despensa local">
                FT
              </div>
            </div>
          </header>

          {mobileNav && (
            <div className="fixed inset-0 z-40 bg-surface-overlay md:hidden" onClick={() => setMobileNav(false)}>
              <div className="h-full w-[260px] bg-content p-5 text-white" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Leaf size={19} className="text-accent-lime" />
                  <p className="font-serif text-xl">freshtrack</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setModal("scan"); setMobileNav(false); }}
                  className="mt-8 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-accent-lime px-3 py-3 text-xs font-bold text-accent-lime-fg"
                >
                  <ScanLine size={16} /> Escanear compra
                </button>
                <div className="mt-6 space-y-1">
                  {currentNavItems.map(({ label, icon: Icon, count }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { navigateToModule(label); setMobileNav(false); }}
                      className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-3 text-left text-xs font-semibold text-brand-subtle/80 hover:text-white"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} />
                        {label}
                      </span>
                      {count && <span>{count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
            <HeroSection
              onOpenScan={() => setModal("scan")}
              onOpenAdd={() => setModal("add")}
              lastScan={lastScan}
              today={today}
              catalogSize={getCatalogSize()}
            />

            <StatsSection
              totalProducts={products.length}
              soonCount={soonCount}
              expiredCount={expiredCount}
              moneySaved={impact.moneySaved}
              kgSaved={impact.kgSaved}
              soonThresholdDays={SOON_THRESHOLD_DAYS}
            />


            <PantrySection
              products={products}
              storedProducts={storedProducts}
              filteredProducts={filteredProducts}
              soonCount={soonCount}
              expiredCount={expiredCount}
              okCount={okCount}
              okPercent={okPercent}
              pOk={pOk}
              pSoon={pSoon}
              totalTracked={totalTracked}
              pantryView={pantryView}
              setPantryView={setPantryView}
              filter={filter}
              setFilter={setFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              search={search}
              setSearch={setSearch}
              showAllPantry={showAllPantry}
              setShowAllPantry={setShowAllPantry}
              onOpenScan={() => setModal("scan")}
              onOpenAdd={() => setModal("add")}
              onEditProduct={setSelectedProduct}
              onLoadDemoProducts={() => {
                const demo = buildDemoProducts(today);
                setStoredProducts(demo);
                toast.success("Datos de ejemplo cargados", {
                  description: `${demo.length} productos agregados a tu despensa.`,
                });
              }}
              onNavigateToReports={() => navigateToModule("Reportes")}
            />

            <ShoppingSection
              shoppingList={shoppingList}
              setShoppingList={setShoppingList}
              pantryProducts={products}
              consumptionHistory={consumptionHistory}
              onAddProductsToPantry={addProducts}
              detectIconFn={detectProductIcon}
            />

            <RecipesSection
              suggestedRoute={suggestedRoute}
              recipes={recipes}
              visibleRecipes={visibleRecipes}
              shownRecipes={shownRecipes}
              recipesLoading={recipesLoading}
              recipesWarning={recipesWarning}
              recipesInfo={recipesInfo}
              recipesError={recipesError}
              recipeFilter={recipeFilter}
              setRecipeFilter={setRecipeFilter}
              recipeLimit={recipeLimit}
              setRecipeLimit={setRecipeLimit}
              onOpenRecipeDetail={openRecipeDetail}
              onInitiateConsumption={initiateRecipeConsumption}
              onSelectProduct={setSelectedProduct}
              onNavigateToPantry={() => navigateToModule("Mi despensa")}
            />

            <ReportsSection
              impact={impact}
              products={products}
              consumptionHistory={consumptionHistory}
              onUndoConsumption={undoConsumption}
            />

            <footer className="flex flex-col gap-2 pb-6 pt-8 text-xs text-content-muted sm:flex-row sm:items-center sm:justify-between">
              <p>FreshTrack · Menos desperdicio, más tranquilidad.</p>
              <p className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-status-ok-dot" /> Datos guardados localmente
              </p>
            </footer>
          </div>
        </main>
      </div>

      <MobileBottomNav
        onOpenScan={() => setModal("scan")}
        pantryCount={products.length}
        pendingShoppingCount={pendingShoppingCount}
      />

      {modal === "scan" && (
        <ScanModal
          onClose={() => setModal(null)}
          onComplete={addProducts}
          detectIconFn={detectProductIcon}
        />
      )}
      {modal === "add" && (
        <AddProductModal
          onClose={() => { setModal(null); setEditingProduct(null); }}
          onAdd={addProduct}
          initialProduct={editingProduct || undefined}
          onCorrection={correctProduct}
          onSuggest={suggestShelfLife}
          today={today}
        />
      )}
      {recipeDetail && (
        <Dialog open={Boolean(recipeDetail)} onOpenChange={(open) => { if (!open) setRecipeDetail(null); }}>
          <DialogContent className="max-w-[620px] p-0 overflow-hidden" hideCloseButton>
            <DialogHeader className="sr-only">
              <DialogTitle>{recipeDetail.title}</DialogTitle>
              <DialogDescription>{recipeDetail.category || "Detalle de receta"}</DialogDescription>
            </DialogHeader>
            <div className="relative h-40 overflow-hidden bg-surface-elevated">
              <img
                src={recipeDetail.image || getRecipeFallbackImage(recipeDetail.title, recipeDetail.category)}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getRecipeFallbackImage(recipeDetail.title, recipeDetail.category);
                }}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-content/90 via-content/40 to-transparent" />
              <button
                type="button"
                aria-label="Cerrar receta"
                onClick={() => setRecipeDetail(null)}
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/80 p-2 text-content backdrop-blur-sm hover:bg-surface"
              >
                <X size={17} />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {recipeDetail.isOriginalEnglish && (
                    <span className="rounded-full bg-status-soon-bg px-2 py-0.5 text-xs font-bold text-status-soon-text border border-status-soon-border">
                      Texto original en inglés
                    </span>
                  )}
                  {(recipeDetail.isLocalFallback || recipeDetail.source === "FreshTrack") && (
                    <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-bold text-brand-text border border-brand-border">
                      Ideas locales
                    </span>
                  )}
                  {recipeDetail.isGlutenFreeEstimated && (
                    <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-bold text-brand-text border border-brand-border">
                      Sin TACC (estimado)
                    </span>
                  )}
                </div>
                <p className="font-serif text-2xl font-semibold text-white">{recipeDetail.title}</p>
                <p className="mt-1 text-xs text-brand-subtle">
                  {recipeDetail.area || "Receta sugerida"}
                  {recipeDetail.category ? ` · ${recipeDetail.category}` : ""}
                </p>
              </div>
            </div>
            {recipeDetailLoading ? (
              <div className="p-6 text-center text-sm text-content-muted">Cargando ingredientes y pasos…</div>
            ) : (
              <div className="p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Ingredientes</p>
                    <div className="mt-3 space-y-2">
                      {(recipeDetail.ingredients || recipeDetail.matchedIngredients.map((name) => ({ name, measure: "a gusto" }))).map((ingredient) => (
                        <div key={`${ingredient.name}-${ingredient.measure}`} className="flex items-start justify-between gap-3 border-b border-line-subtle pb-2 text-xs">
                          <span className="font-semibold text-content-heading">{ingredient.name}</span>
                          <span className="text-right text-content-muted">{ingredient.measure}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Paso a paso</p>
                    <div className="mt-3 space-y-3">
                      {(recipeDetail.instructions || "Prepará los ingredientes, cociná hasta que estén tiernos y serví caliente.").split(/\r?\n+/).filter(Boolean).map((step, index) => (
                        <div key={`${index}-${step.slice(0, 8)}`} className="flex gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-bold text-brand-text">{index + 1}</span>
                          <p className="text-xs leading-5 text-content-body">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="consume-recipe"
                  onClick={() => {
                    initiateRecipeConsumption(recipeDetail);
                    setRecipeDetail(null);
                  }}
                  className="mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-focus"
                >
                  <Check size={15} /> Aproveché esta receta
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
      {notificationModal && <NotificationSettingsModal onClose={() => setNotificationModal(false)} products={products} preferences={notificationPreferences} onSave={savePreferences} />}
      {consumptionPlanToConfirm && (
        <ConsumptionConfirmDialog
          isOpen={true}
          onClose={() => setConsumptionPlanToConfirm(null)}
          recipeTitle={consumptionPlanToConfirm.recipe.title}
          plan={consumptionPlanToConfirm.plan}
          onConfirm={handleConfirmConsumption}
        />
      )}
      {selectedProduct && (
        <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
          <DialogContent className="max-w-[370px] p-5">
            <DialogHeader>
              <DialogTitle>{selectedProduct.name}</DialogTitle>
              <DialogDescription>{selectedProduct.category} · {selectedProduct.quantity}</DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-3 mt-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-2xl">{selectedProduct.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-content-muted">Almacenado en {selectedProduct.location || inferLocation(selectedProduct.category)}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-surface-subtle p-3.5 border border-line">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-content-muted">{labelForDisplay(selectedProduct.dateLabel || "desconocida")}</span>
                <MiniStatus status={selectedProduct.status} />
              </div>
              <p className="mt-2 text-lg font-semibold text-content-heading">{selectedProduct.expiry}</p>
              <p className="mt-1 text-xs text-content-muted">{formatRelativeDays(selectedProduct.days)}</p>
              {selectedProduct.corrected && <p className="mt-2 text-xs font-semibold text-brand-text">✓ Corrección aplicada a futuras detecciones</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setEditingProduct(selectedProduct); setSelectedProduct(null); setModal("add"); }}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-content-body hover:bg-surface-elevated"
              >
                <Pencil size={14} /> Corregir
              </button>
              <button
                type="button"
                onClick={removeSelected}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-status-expired-bg border border-status-expired-border px-3 py-2.5 text-xs font-bold text-status-expired-text hover:opacity-90"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
