import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  HardDrive,
  Home as HomeIcon,
  Leaf,
  Menu,
  Moon,
  PackageOpen,
  Pencil,
  ScanLine,
  Search,
  ShoppingCart,
  Smartphone,
  Sun,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { BackupModal } from "@/components/BackupModal";
import { playChimeSound, triggerHaptic } from "@/lib/feedback";

function scaleMeasure(measure: string, factor: number): string {
  if (factor === 1 || !measure) return measure;
  return measure.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(",", "."));
    if (isNaN(num)) return match;
    const scaled = Math.round(num * factor * 10) / 10;
    return String(scaled);
  });
}
import { DateLabel, getLearningRule, labelForDisplay, saveLearningCorrection } from "@/lib/dateRecognition";
import {
  estimateShelfLife,
  getCatalogSize,
  ShelfLifeState,
  saveShelfLifeCorrection,
  calculateOpenProduct,
  isFreshProduceCategory,
  FreshCondition,
} from "@/lib/shelfLifeCatalog";
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
  clearNotificationDailyLimit,
  getNotificationPermission,
  notifyExpiringProducts,
  promptPWAInstall,
  requestNotificationPermission,
  subscribeToInstallPrompt,
} from "@/lib/pwaAndNotifications";
import { loadShoppingList, saveShoppingList, ShoppingItem, addRecipeMissingToShoppingList, addOrMergeShoppingItem } from "@/lib/shoppingList";

import { Product, StoredProduct, ProductStatus, deriveProduct } from "@/types/product";
import { ALL_CATEGORIES } from "@/lib/categories";
import { addDaysISO, daysUntil, formatRelativeDays, SOON_THRESHOLD_DAYS, todayISO, useToday } from "@/lib/dates";
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
  const [location, setLocation] = useState(initialProduct?.location || inferLocation(initialProduct?.category || "Almacén seco"));
  const [isCustomLocation, setIsCustomLocation] = useState(Boolean(initialProduct?.location));
  const [quantity, setQuantity] = useState(initialProduct?.quantity || "1 unidad");
  const [expiryDate, setExpiryDate] = useState(() => initialProduct?.expiryDate || addDaysISO(7, today));
  const [isCustomExpiry, setIsCustomExpiry] = useState(false);
  const [dateLabel, setDateLabel] = useState<DateLabel>(initialProduct?.dateLabel || "vencimiento");
  const isProduce = isFreshProduceCategory(category);
  const [freshCondition, setFreshCondition] = useState<FreshCondition>("fresco");
  const [shelfState, setShelfState] = useState<ShelfLifeState>(initialProduct?.state || "cerrado");
  const [shelfDays, setShelfDays] = useState(() => {
    if (initialProduct?.expiryDate) {
      return Math.max(1, daysUntil(initialProduct.expiryDate, today));
    }
    return estimateShelfLife(initialProduct?.name || "", "cerrado", initialProduct?.category)?.days || 7;
  });
  const isEditing = Boolean(initialProduct);

  const shelfEstimate = useMemo(() => {
    return name.trim()
      ? estimateShelfLife(name, shelfState, category, isProduce ? freshCondition : undefined)
      : undefined;
  }, [name, shelfState, category, isProduce, freshCondition]);

  const handleNameChange = (val: string) => {
    setName(val);
    const estimate = estimateShelfLife(val, shelfState, category, isProduce ? freshCondition : undefined);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (!isCustomLocation) {
      setLocation(inferLocation(val));
    }
    const produce = isFreshProduceCategory(val);
    const estimate = estimateShelfLife(name, shelfState, val, produce ? freshCondition : undefined);
    if (estimate) {
      setShelfDays(estimate.days);
      if (!isCustomExpiry && !isEditing) {
        setExpiryDate(addDaysISO(estimate.days, today));
      }
    }
  };

  const handleFreshConditionChange = (val: FreshCondition) => {
    setFreshCondition(val);
    const estimate = estimateShelfLife(name, shelfState, category, val);
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
      const finalState = isProduce ? "cerrado" : shelfState;
      const openedAt = (!isProduce && shelfState === "abierto") ? todayISO(today) : undefined;
      onAdd({
        id: Date.now(),
        name: name.trim(),
        category,
        expiryDate,
        quantity: quantity.trim() || "1 unidad",
        icon: detectProductIcon(name, category),
        dateLabel,
        location,
        state: finalState,
        openedAt,
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
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none transition placeholder:text-content-muted focus:border-brand-focus focus:ring-2 focus:ring-brand-subtle"
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
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Ubicación</span>
              <select
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setIsCustomLocation(true);
                }}
                className="w-full appearance-none rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
              >
                <option value="Heladera">❄️ Heladera</option>
                <option value="Freezer">🧊 Freezer</option>
                <option value="Alacena">🥫 Alacena</option>
                <option value="Cajón verduras">🥬 Cajón verduras</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-content-muted">Cantidad</span>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 2 unidades, 500g"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-content-body outline-none focus:border-brand-focus"
            />
          </label>
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
                  {shelfEstimate?.label || (
                    isProduce
                      ? (freshCondition === "pasado" ? "Calculado para producto maduro o ya pasado." : "Calculado para producto fresco recién comprado.")
                      : (shelfState === "abierto" ? "Calculado para envase abierto." : "Calculado según guías de conservación.")
                  )}
                </p>
              </div>
              {isProduce ? (
                <select
                  aria-label="Condición del producto"
                  value={freshCondition}
                  onChange={(e) => handleFreshConditionChange(e.target.value as FreshCondition)}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold text-brand-text"
                >
                  <option value="fresco">Recién comprado</option>
                  <option value="pasado">Ya un poco pasado</option>
                </select>
              ) : (
                <select
                  aria-label="Estado del envase"
                  value={shelfState}
                  onChange={(e) => handleShelfStateChange(e.target.value as ShelfLifeState)}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-semibold text-brand-text"
                >
                  <option value="cerrado">Cerrado</option>
                  <option value="abierto">Abierto</option>
                </select>
              )}
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
            className="flex-1 min-h-[44px] rounded-xl border border-line px-4 py-3 text-xs font-semibold text-content-body transition duration-150 hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-brand-focus active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={handleSave}
            className="flex-1 min-h-[44px] rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white transition duration-150 hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
  const [productToOpen, setProductToOpen] = useState<Product | null>(null);
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

  // Theme state
  const { theme, toggleTheme } = useTheme();

  // Location filter & Batch Selection & Backup & Recipe Portions states
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [recipePortions, setRecipePortions] = useState<number>(2);

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
      const prodLoc = (product.location || inferLocation(product.category)).toLowerCase();
      const matchesLocation =
        locationFilter === "all" ||
        prodLoc.includes(locationFilter.toLowerCase());
      if (!matchesFilter || !matchesCategory || !matchesLocation) return false;
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
  }, [filter, products, search, categoryFilter, locationFilter, sortBy]);

  const handleQuickConsume = (product: Product) => {
    playChimeSound("success");
    triggerHaptic();

    const record: ConsumptionRecord = {
      id: Date.now(),
      title: product.name,
      ingredients: [product.name],
      before: [product],
      applied: [{ itemId: Number(product.id), deducted: "1 unidad" }],
      delta: { kg: 0.35, money: 1200, meals: 1 },
      createdAt: todayISO(today),
    };
    setConsumptionHistory((prev) => [...prev, record]);

    const currentQtyNum = parseInt(product.quantity, 10);
    if (!isNaN(currentQtyNum) && currentQtyNum > 1) {
      const rest = product.quantity.replace(/^\d+\s*/, "");
      const nextQty = `${currentQtyNum - 1} ${rest}`.trim();
      setStoredProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, quantity: nextQty } : p))
      );
      toast.success(`Consumiste 1 unidad de ${product.name}`, {
        description: `Quedan ${nextQty}.`,
      });
    } else {
      setStoredProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success(`Consumiste ${product.name}`, {
        description: "Se guardó en tu balance de ahorro.",
        action: {
          label: "Deshacer",
          onClick: () => {
            setStoredProducts((prev) => [...prev, product]);
            setConsumptionHistory((prev) => prev.filter((h) => h.id !== record.id));
            toast.info(`Se restauró ${product.name} a tu despensa`);
          },
        },
      });
    }
  };

  const handleToggleSelectProduct = (product: Product) => {
    setSelectedProductIds((prev) =>
      prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]
    );
  };

  const handleSelectAllFiltered = () => {
    setSelectedProductIds(filteredProducts.map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleBatchConsume = () => {
    if (selectedProductIds.length === 0) return;
    playChimeSound("success");
    triggerHaptic();

    const consumed = products.filter((p) => selectedProductIds.includes(p.id));
    const newRecords: ConsumptionRecord[] = consumed.map((p) => ({
      id: Date.now() + Math.random(),
      title: p.name,
      ingredients: [p.name],
      before: [p],
      applied: [{ itemId: Number(p.id), deducted: p.quantity }],
      delta: { kg: 0.35, money: 1200, meals: 1 },
      createdAt: todayISO(today),
    }));

    setConsumptionHistory((prev) => [...prev, ...newRecords]);
    setStoredProducts((prev) => prev.filter((p) => !selectedProductIds.includes(p.id)));
    toast.success(`Consumiste ${consumed.length} alimentos por lote`, {
      description: "¡Excelente aprovechamiento de tu cocina!",
    });
    setSelectedProductIds([]);
  };

  const handleBatchAddToShoppingList = () => {
    if (selectedProductIds.length === 0) return;
    playChimeSound("pop");
    const items = products.filter((p) => selectedProductIds.includes(p.id));
    items.forEach((item) => {
      setShoppingList((prev) =>
        addOrMergeShoppingItem(prev, {
          name: item.name,
          quantity: item.quantity,
          category: item.category,
        })
      );
    });
    toast.success(`Agregaste ${items.length} alimentos a la lista de compras`);
    setSelectedProductIds([]);
  };

  const handleBatchMoveLocation = (targetLocation: string) => {
    if (selectedProductIds.length === 0) return;
    playChimeSound("pop");
    setStoredProducts((prev) =>
      prev.map((p) => {
        if (!selectedProductIds.includes(p.id)) return p;
        let nextExpiry = p.expiryDate;
        if (targetLocation === "Freezer" && p.location !== "Freezer") {
          nextExpiry = addDaysISO(90, new Date(p.expiryDate));
        }
        return { ...p, location: targetLocation, expiryDate: nextExpiry };
      })
    );
    toast.success(`Moviste ${selectedProductIds.length} alimentos a ${targetLocation}`, {
      description: targetLocation === "Freezer" ? "Se extendió automáticamente el vencimiento estimado." : undefined,
    });
    setSelectedProductIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`¿Seguro que querés eliminar ${selectedProductIds.length} alimentos?`)) return;
    playChimeSound("delete");
    setStoredProducts((prev) => prev.filter((p) => !selectedProductIds.includes(p.id)));
    toast.info(`Se eliminaron ${selectedProductIds.length} alimentos`);
    setSelectedProductIds([]);
  };

  const soonCount = products.filter((p) => p.status === "soon").length;
  const expiredCount = products.filter((p) => p.status === "expired").length;
  const okCount = products.filter((p) => p.status === "ok").length;
  const totalTracked = products.length;
  const okPercent = totalTracked > 0 ? Math.round((okCount / totalTracked) * 100) : 100;
  const soonPercent = totalTracked > 0 ? Math.round((soonCount / totalTracked) * 100) : 0;
  const pOk = okPercent;
  const pSoon = Math.min(100, pOk + soonPercent);

  const pendingShoppingCount = shoppingList.filter((item) => !item.completed).length;
  const visibleRecipes = recipes.filter((recipe) => recipeMatchesFilter(recipe, recipeFilter));
  const shownRecipes = visibleRecipes.slice(0, recipeLimit);

  const currentNavItems = [
    { id: "Resumen", label: "Resumen", fullLabel: "Resumen", icon: HomeIcon },
    { id: "Despensa", label: "Despensa", fullLabel: "Mi despensa", icon: PackageOpen, count: products.length > 0 ? String(products.length) : undefined },
    { id: "Recetas", label: "Recetas", fullLabel: "Recetas sugeridas", icon: Utensils, count: visibleRecipes.length > 0 ? String(visibleRecipes.length) : undefined },
    { id: "Compras", label: "Compras", fullLabel: "Lista de compras", icon: ShoppingCart, count: pendingShoppingCount > 0 ? String(pendingShoppingCount) : undefined },
    { id: "Reportes", label: "Reportes", fullLabel: "Reportes y balance", icon: BarChart3 },
  ];

  const notificationGroups = groupNotifications(products, notificationPreferences);

  useEffect(() => { saveStoredProducts(storedProducts); }, [storedProducts]);

  useEffect(() => {
    const sectionMap = [
      { id: "module-summary", nav: "Resumen" },
      { id: "module-pantry", nav: "Despensa" },
      { id: "module-recipes", nav: "Recetas" },
      { id: "module-shopping", nav: "Compras" },
      { id: "module-reports", nav: "Reportes" },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const matched = sectionMap.find((s) => s.id === visible[0].target.id);
          if (matched) {
            setActiveNav(matched.nav);
          }
        }
      },
      {
        root: null,
        rootMargin: "-100px 0px -40% 0px",
        threshold: [0.1, 0.3, 0.6],
      }
    );

    sectionMap.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

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

  const handleConfirmOpen = (product: Product | StoredProduct) => {
    const calc = calculateOpenProduct(product, today);
    setStoredProducts((current) =>
      current.map((item) => (item.id === product.id ? calc.updatedProduct : item))
    );
    if (calc.newDays <= 2) {
      clearNotificationDailyLimit();
    }
    toast.success(`Marcaste “${product.name}” como abierto`, {
      description: `Nueva fecha: ${calc.newExpiryDate} (${calc.newDays} ${calc.newDays === 1 ? "día restante" : "días restantes"}).`,
    });
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

  const navigateToModule = (key: string) => {
    setActiveNav(key);
    if (key === "Mi despensa" || key === "Despensa") setPantryView("calendar");
    const targets: Record<string, string> = {
      Resumen: "module-summary",
      "Mi despensa": "module-pantry",
      Despensa: "module-pantry",
      Recetas: "module-recipes",
      "Lista de compras": "module-shopping",
      Compras: "module-shopping",
      Reportes: "module-reports",
    };
    document.getElementById(targets[key] || "module-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      {/* Pinned Fixed Top Navigation Bar - Always visible on scroll without disappearing */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#070e0a]/95 backdrop-blur-xl border-b border-emerald-950/10 dark:border-emerald-800/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all">
        <div className="w-full max-w-[1280px] mx-auto px-3 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Brand Wordmark & Subtle Live Indicator */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigateToModule("Resumen")}
              className="flex items-center gap-2.5 text-left group transition hover:opacity-95"
              aria-label="Ir a la portada de FreshTrack"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs transition group-hover:scale-105">
                <Leaf size={16} strokeWidth={2.4} />
              </span>
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-content-heading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                freshtrack
              </span>
            </button>
            <span className="hidden xl:inline-flex tomorro-tag-beacon">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              v1.0 Activo
            </span>
          </div>

          {/* Desktop Nav Links - Centered & Highly Legible */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface-muted/60 dark:bg-emerald-950/20 border border-line" aria-label="Navegación principal">
            {currentNavItems.map(({ id, label, fullLabel, count }) => {
              const isActive =
                activeNav === id ||
                activeNav === label ||
                (fullLabel && activeNav === fullLabel) ||
                (id === "Despensa" && activeNav === "Mi despensa") ||
                (id === "Compras" && activeNav === "Lista de compras");

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigateToModule(id)}
                  className={`flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-content-muted hover:text-content-heading hover:bg-surface/80"
                  }`}
                >
                  <span>{label}</span>
                  {count && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Controls Right */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Search */}
            <div className="hidden md:flex items-center relative">
              <div className="flex items-center gap-2 rounded-full border border-line bg-surface/80 dark:bg-[#0c1610] px-3 py-1.5 text-xs text-content-muted transition-all duration-200 focus-within:w-48 lg:focus-within:w-56 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 w-32 lg:w-40 shadow-xs">
                <Search size={14} className="text-content-muted shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar alimentos..."
                  aria-label="Buscar en la despensa"
                  className="w-full bg-transparent text-xs text-content outline-none placeholder:text-content-muted/80"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-content-muted hover:text-content shrink-0"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {canInstallPWA && (
              <button
                type="button"
                onClick={() => promptPWAInstall()}
                title="Instalar aplicación en tu dispositivo"
                className="hidden sm:inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-surface/80 dark:bg-[#0c1610] px-3 py-1 text-xs font-semibold text-content hover:bg-surface-muted hover:border-emerald-500/40 transition shadow-xs"
              >
                <Smartphone size={13} className="text-emerald-500" />
                <span>App</span>
              </button>
            )}

            {/* Dark Mode Switcher */}
            <button
              type="button"
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80 dark:bg-[#0c1610] text-content-muted hover:text-content hover:border-emerald-500/40 hover:bg-surface-muted transition shadow-xs"
            >
              {theme === "dark" ? (
                <Sun size={15} className="text-amber-400" />
              ) : (
                <Moon size={15} className="text-slate-600" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notificaciones"
              title="Notificaciones de vencimiento"
              onClick={() => setNotificationModal(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80 dark:bg-[#0c1610] text-content-muted hover:text-content hover:border-emerald-500/40 hover:bg-surface-muted transition shadow-xs"
            >
              <Bell size={15} />
              {notificationGroups.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
                  {notificationGroups.length}
                </span>
              )}
            </button>

            {/* Backup & Export Modal Button */}
            <button
              type="button"
              aria-label="Copia de seguridad y exportar"
              title="Copia de seguridad y exportar"
              onClick={() => setBackupModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80 dark:bg-[#0c1610] text-content-muted hover:text-content hover:border-emerald-500/40 hover:bg-surface-muted transition shadow-xs"
            >
              <HardDrive size={15} />
            </button>

            {/* Primary CTA pill */}
            <button
              type="button"
              onClick={() => setModal("scan")}
              className="tomorro-btn-primary min-h-[38px] text-xs px-3 sm:px-4 font-semibold shadow-xs hover:shadow-md transition-all shrink-0"
            >
              <ScanLine size={15} strokeWidth={2.4} />
              <span className="hidden sm:inline">Escanear compra</span>
              <span className="sm:hidden">Escanear</span>
            </button>

            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/80 dark:bg-[#0c1610] text-content lg:hidden hover:bg-surface-muted transition shadow-xs"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Menú principal"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileNav && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav(false)}
        >
          <div
            className="h-full w-[290px] bg-surface border-r border-line p-6 text-content shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Leaf size={15} strokeWidth={2.4} />
                </span>
                <p className="font-display text-lg font-bold text-content-heading">freshtrack</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-content-muted hover:text-content"
                aria-label="Cerrar menú"
              >
                <X size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setModal("scan");
                setMobileNav(false);
              }}
              className="tomorro-btn-primary mt-6 min-h-[44px] w-full text-xs font-semibold"
            >
              <ScanLine size={16} /> Escanear compra
            </button>

            <div className="mt-6 space-y-1.5">
              {currentNavItems.map(({ id, label, fullLabel, icon: Icon, count }) => {
                const isActive =
                  activeNav === id ||
                  activeNav === label ||
                  (fullLabel && activeNav === fullLabel) ||
                  (id === "Despensa" && activeNav === "Mi despensa") ||
                  (id === "Compras" && activeNav === "Lista de compras");

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      navigateToModule(id);
                      setMobileNav(false);
                    }}
                    className={`flex min-h-[42px] w-full items-center justify-between rounded-full px-4 py-2.5 text-left text-xs font-semibold transition ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-content-muted hover:text-content hover:bg-surface-muted"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={16} />
                      {fullLabel || label}
                    </span>
                    {count && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-line pt-4 space-y-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex min-h-[40px] w-full items-center justify-between rounded-full px-4 py-2 text-xs font-semibold text-content-muted hover:text-content hover:bg-surface-muted"
              >
                <span className="flex items-center gap-3">
                  {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-600" />}
                  Modo {theme === "dark" ? "claro" : "oscuro"}
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotificationModal(true);
                  setMobileNav(false);
                }}
                className="flex min-h-[40px] w-full items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold text-content-muted hover:text-content hover:bg-surface-muted"
              >
                <Bell size={15} /> Notificaciones
              </button>
              <button
                type="button"
                onClick={() => {
                  setBackupModalOpen(true);
                  setMobileNav(false);
                }}
                className="flex min-h-[40px] w-full items-center gap-3 rounded-full px-4 py-2 text-xs font-semibold text-content-muted hover:text-content hover:bg-surface-muted"
              >
                <HardDrive size={15} /> Copia de seguridad y exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Centered Max-Width 1200px Page Layout */}
      <main id="main-content" className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 py-4 sm:py-6 space-y-6 sm:space-y-8 pb-24 md:pb-12 overflow-x-hidden">
            <HeroSection
              onOpenScan={() => setModal("scan")}
              onOpenAdd={() => setModal("add")}
              lastScan={lastScan}
              today={today}
              catalogSize={getCatalogSize()}
              products={products}
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
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              search={search}
              setSearch={setSearch}
              showAllPantry={showAllPantry}
              setShowAllPantry={setShowAllPantry}
              onOpenScan={() => setModal("scan")}
              onOpenAdd={() => setModal("add")}
              onEditProduct={setSelectedProduct}
              onOpenProduct={setProductToOpen}
              onQuickConsume={handleQuickConsume}
              selectedIds={selectedProductIds}
              onToggleSelectProduct={handleToggleSelectProduct}
              onSelectAllFiltered={handleSelectAllFiltered}
              onClearSelection={handleClearSelection}
              onBatchConsume={handleBatchConsume}
              onBatchAddToShoppingList={handleBatchAddToShoppingList}
              onBatchMoveLocation={handleBatchMoveLocation}
              onBatchDelete={handleBatchDelete}
              onLoadDemoProducts={() => {
                const demo = buildDemoProducts(today);
                setStoredProducts(demo);
                toast.success("Datos de ejemplo cargados", {
                  description: `${demo.length} productos agregados a tu despensa.`,
                });
              }}
              onNavigateToReports={() => navigateToModule("Reportes")}
            />

            <RecipesSection
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
              pantryProducts={products}
              onAddMissingToShoppingList={(recipeTitle, missing) => {
                setShoppingList((prev) =>
                  addRecipeMissingToShoppingList(prev, recipeTitle, missing)
                );
                toast.success(`Faltantes de “${recipeTitle}” agregados a la lista de compras`, {
                  description: `Se sumaron ${missing.length} ${
                    missing.length === 1 ? "ingrediente" : "ingredientes"
                  } con el motivo "Lo necesitás para ${recipeTitle}".`,
                });
              }}
              onOpenAdd={() => setModal("add")}
              onOpenScan={() => setModal("scan")}
              shoppingList={shoppingList}
              setShoppingList={setShoppingList}
              onNavigateToShopping={() => navigateToModule("Compras")}
            />

            <ShoppingSection
              shoppingList={shoppingList}
              setShoppingList={setShoppingList}
              pantryProducts={products}
              consumptionHistory={consumptionHistory}
              onAddProductsToPantry={addProducts}
              detectIconFn={detectProductIcon}
            />

            <ReportsSection
              impact={impact}
              products={products}
              consumptionHistory={consumptionHistory}
              onUndoConsumption={undoConsumption}
            />

            <footer className="flex flex-col gap-2 pb-6 pt-8 text-xs text-content-muted sm:flex-row sm:items-center sm:justify-between border-t border-line/60">
              <p>FreshTrack · Menos desperdicio, más tranquilidad.</p>
              <p className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" /> Datos guardados localmente
              </p>
            </footer>
        </main>

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
                <p className="font-display text-2xl font-bold tracking-tight text-white">{recipeDetail.title}</p>
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
                    <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-content-muted">Ingredientes</p>
                      <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-subtle px-2 py-0.5 text-xs">
                        <span className="text-[11px] font-semibold text-content-muted">Porciones:</span>
                        <button
                          type="button"
                          onClick={() => setRecipePortions((p) => Math.max(1, p - 1))}
                          className="flex h-5 w-5 items-center justify-center rounded bg-surface hover:bg-surface-elevated font-bold text-content text-xs"
                          title="Menos porciones"
                        >
                          -
                        </button>
                        <span className="font-bold text-brand min-w-[12px] text-center">{recipePortions}</span>
                        <button
                          type="button"
                          onClick={() => setRecipePortions((p) => Math.min(12, p + 1))}
                          className="flex h-5 w-5 items-center justify-center rounded bg-surface hover:bg-surface-elevated font-bold text-content text-xs"
                          title="Más porciones"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(recipeDetail.ingredients || recipeDetail.matchedIngredients.map((name) => ({ name, measure: "a gusto" }))).map((ingredient) => (
                        <div key={`${ingredient.name}-${ingredient.measure}`} className="flex items-start justify-between gap-3 border-b border-line-subtle pb-2 text-xs">
                          <span className="font-semibold text-content-heading">{ingredient.name}</span>
                          <span className="text-right text-content-muted">
                            {scaleMeasure(ingredient.measure, recipePortions / 2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {recipeDetail.ingredients && (
                      <button
                        type="button"
                        onClick={() => {
                          const missing = recipeDetail.ingredients!.filter(
                            (ing) => !recipeDetail.matchedIngredients.some((m) => m.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(m.toLowerCase()))
                          );
                          if (missing.length === 0) {
                            toast.info("¡Tenés todos los ingredientes en tu despensa!");
                            return;
                          }
                          missing.forEach((m) => {
                            setShoppingList((prev) =>
                              addOrMergeShoppingItem(prev, {
                                name: m.name,
                                quantity: scaleMeasure(m.measure, recipePortions / 2) || "1 unidad",
                                category: "Almacén seco",
                              })
                            );
                          });
                          playChimeSound("pop");
                          toast.success(`Agregaste ${missing.length} faltantes a tu lista de compras`, {
                            description: `Cantidades adaptadas para ${recipePortions} porciones.`,
                          });
                        }}
                        className="mt-3.5 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-subtle px-3 py-1.5 text-xs font-bold text-brand-text hover:bg-surface transition"
                      >
                        <ShoppingCart size={13} /> Agregar faltantes a la lista de compras
                      </button>
                    )}
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
      <BackupModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        products={products}
        storedProducts={storedProducts}
        onRestoreSuccess={() => {
          setStoredProducts(loadStoredProducts(today) ?? []);
          setConsumptionHistory(loadConsumptionHistory());
          setShoppingList(loadShoppingList());
        }}
      />
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
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const prod = selectedProduct;
                  setSelectedProduct(null);
                  handleQuickConsume(prod);
                }}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Check size={15} strokeWidth={2.4} /> Consumir 1 unidad
              </button>

              {selectedProduct.location !== "Freezer" ? (
                <button
                  type="button"
                  onClick={() => {
                    handleBatchMoveLocation("Freezer");
                    setSelectedProduct(null);
                  }}
                  className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content hover:bg-surface-muted"
                >
                  🧊 Mover al Freezer (+90 días estimado)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleBatchMoveLocation("Heladera");
                    setSelectedProduct(null);
                  }}
                  className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content hover:bg-surface-muted"
                >
                  ❄️ Pasar a Heladera
                </button>
              )}

              {selectedProduct.state === "cerrado" && !isFreshProduceCategory(selectedProduct.category) && (
                <button
                  type="button"
                  onClick={() => {
                    const prod = selectedProduct;
                    setSelectedProduct(null);
                    setProductToOpen(prod);
                  }}
                  className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                >
                  <PackageOpen size={15} /> Marcar como abierto
                </button>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEditingProduct(selectedProduct); setSelectedProduct(null); setModal("add"); }}
                  className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-content-body hover:bg-surface-elevated"
                >
                  <Pencil size={14} /> Corregir
                </button>
                <button
                  type="button"
                  onClick={removeSelected}
                  className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-status-expired-bg border border-status-expired-border px-3 py-2 text-xs font-bold text-status-expired-text hover:opacity-90"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {productToOpen && (() => {
        const calc = calculateOpenProduct(productToOpen, today);
        return (
          <Dialog open={Boolean(productToOpen)} onOpenChange={(open) => { if (!open) setProductToOpen(null); }}>
            <DialogContent className="max-w-[400px] p-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PackageOpen className="text-amber-600 dark:text-amber-400" size={20} />
                  ¿Marcar como abierto?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {productToOpen.name} · {productToOpen.category}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 rounded-xl border border-line bg-surface-subtle p-3.5 space-y-2">
                <p className="text-sm font-semibold text-content-heading">
                  Al abrirlo, vence en{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {calc.newDays} {calc.newDays === 1 ? "día" : "días"}
                  </span>{" "}
                  en vez de {calc.previousDays} {calc.previousDays === 1 ? "día" : "días"}.
                </p>
                <p className="text-xs text-content-muted">
                  Nueva fecha: <span className="font-semibold text-content-body">{calc.newExpiryDate}</span>
                </p>

                {calc.warningNotice && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>{calc.warningNotice}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setProductToOpen(null)}
                  className="flex-1 min-h-[44px] rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-content-body hover:bg-surface-elevated"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmOpen(productToOpen);
                    setProductToOpen(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
                >
                  Confirmar y abrir
                </button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
