import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Home as HomeIcon,
  Leaf,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageOpen,
  Pencil,
  Plus,
  Route,
  ScanLine,
  Search,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { DateLabel, getLearningRule, labelForDisplay, saveLearningCorrection } from "@/lib/dateRecognition";
import { estimateShelfLife, getCatalogSize, getValidationThreshold, ShelfLifeState, submitShelfLifeSuggestion } from "@/lib/shelfLifeCatalog";
import { buildWeeklySummary, defaultNotificationPreferences, groupNotifications, loadNotificationPreferences, NotificationPreferences, saveNotificationPreferences } from "@/lib/notificationRules";
import { getRecipeDetails, RecipeSuggestion, searchRecipesByIngredients } from "@/lib/recipeApi";
import { formatMoney, ImpactStats, loadImpactStats, recordImpact, reverseImpact } from "@/lib/impactStats";
import {
  ConsumptionPlan,
  ConsumptionRecord,
  SelectedDeduction,
  planRecipeConsumption,
  applyConsumptionPlan,
  undoConsumptionHistory,
} from "@/lib/inventoryConsumption";
import { isQuantityLow } from "@/lib/quantity";
import { ConsumptionConfirmDialog } from "@/components/ConsumptionConfirmDialog";
import { ScanModal } from "@/components/ScanModal";
import { ShoppingListModule } from "@/components/ShoppingListModule";
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
import { addDaysISO, daysUntil, formatRelativeDays, formatTimeAgo, SOON_THRESHOLD_DAYS, useToday } from "@/lib/dates";
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
  const text = `${recipe.title} ${recipe.matchedIngredients.join(" ")} ${(recipe.ingredients || []).map((item) => item.name).join(" ")}`;
  if (filter === "vegetarian") return !/(chicken|pollo|beef|carne|pork|cerdo|bacon|salmon|fish|pescado|tuna|atún|meat)/i.test(text);
  if (filter === "glutenFree") return !/(bread|pan|pasta|flour|harina|wheat|trigo|noodle|fideos|couscous)/i.test(text);
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

const statusCopy: Record<ProductStatus, { label: string; color: string; dot: string }> = {
  ok: { label: "En fecha", color: "text-[#43715b] bg-[#e7f1e9]", dot: "bg-[#5d9b72]" },
  soon: { label: "Por vencer", color: "text-[#9b6b19] bg-[#fbf0d2]", dot: "bg-[#e3aa36]" },
  expired: { label: "Vencido", color: "text-[#a94c3c] bg-[#f9e5df]", dot: "bg-[#d66f5b]" },
};

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

function MiniStatus({ status }: { status: ProductStatus }) {
  const meta = statusCopy[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ProductRow({ product, onEdit }: { product: Product; onEdit: (product: Product) => void }) {
  const lowStock = isQuantityLow(product.quantity);
  const alertTone = product.status === "expired" ? "border-l-4 border-l-[#d66f5b] bg-[#fff4f0]" : product.status === "soon" ? "border-l-4 border-l-[#e3aa36] bg-[#fffaf0]" : lowStock ? "border-l-4 border-l-[#78a986] bg-[#f4faf2]" : "";
  return (
    <div className={`group grid grid-cols-[minmax(0,1fr)_110px_92px_28px] items-center gap-3 border-b border-[#ece8df] py-3.5 pl-2 last:border-b-0 ${alertTone}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f1e7] text-xl">{product.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1c332b]">{product.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#8a928b]">{product.quantity} · {product.category}</p>{product.status === "soon" && <span className="mt-1 inline-flex rounded-full bg-[#fbefcf] px-1.5 py-0.5 text-[9px] font-bold text-[#a67425]">Vence pronto</span>}{product.status === "expired" && <span className="mt-1 inline-flex rounded-full bg-[#f9e5df] px-1.5 py-0.5 text-[9px] font-bold text-[#a94c3c]">Revisar hoy</span>}{product.status !== "expired" && lowStock && <span className="mt-1 inline-flex rounded-full bg-[#e5f1e3] px-1.5 py-0.5 text-[9px] font-bold text-[#4f805b]">Queda poco</span>}
        </div>
      </div>
      <div className="text-left">
        <p className="text-[12px] font-semibold text-[#34473e]">{product.expiry}</p>
        <p className="mt-0.5 text-[11px] text-[#9aa098]">{formatRelativeDays(product.days)}</p>
      </div>
      <MiniStatus status={product.status} />
      <div className="relative flex justify-end">
        <button aria-label={`Acciones para ${product.name}`} onClick={() => onEdit(product)} className="rounded-lg p-1.5 text-[#a2aaa2] opacity-100 sm:opacity-0 transition sm:group-hover:opacity-100 hover:bg-[#f4f1e9] hover:text-[#1f493a]">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-[20px] border border-[#ece8df] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(55,63,48,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(55,63,48,0.08)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-[#929991]">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-[#1c332b]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#8d968e]">{note}</p>
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-[580px] overflow-y-auto rounded-[28px] border border-white/70 bg-[#fffdf9] p-5 shadow-[0_30px_80px_rgba(13,33,25,0.26)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-serif text-xl font-semibold text-[#17372b]">Notificaciones y Alertas Push</p>
            <p className="mt-0.5 text-[12px] text-[#8e978f]">Avisos automáticos a 1 o 2 días del vencimiento.</p>
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="rounded-full p-2 text-[#8e978f] hover:bg-[#f3efe7]">
            <X size={18} />
          </button>
        </div>

        {/* Browser Permission & Push Test banner */}
        <div className="mt-4 rounded-2xl border border-[#d2e4d5] bg-[#eef7ee] p-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-bold text-[#1f4a32]">Alertas en el sistema / celular</p>
              <p className="text-[11px] text-[#608269]">
                {permission === "granted"
                  ? "✓ Notificaciones del navegador autorizadas."
                  : permission === "denied"
                  ? "Notificaciones bloqueadas en el navegador."
                  : "Habilitá avisos para recibir notificaciones cuando algo esté por vencer."}
              </p>
            </div>
            {permission !== "granted" ? (
              <button
                onClick={handleRequestPermission}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#1f493a] px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#16392c]"
              >
                <Bell size={13} /> Activar notificaciones
              </button>
            ) : (
              <button
                onClick={handleTestNotification}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#bad5bf] bg-white px-3 py-2 text-[11px] font-bold text-[#235539] shadow-sm hover:bg-[#f5f9f4]"
              >
                <Bell size={13} /> Probar aviso (1-2 días)
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
            className={`rounded-2xl border p-4 text-left transition ${
              draft.enabled ? "border-[#bad6bd] bg-[#eff7ed]" : "border-[#e6e4dc] bg-[#faf9f5]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#315542]">Alertas agrupadas</span>
              <span className={`h-5 w-9 rounded-full p-0.5 ${draft.enabled ? "bg-[#5b9368]" : "bg-[#c9d0c9]"}`}>
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition ${
                    draft.enabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-[#7f9182]">
              Agrupa productos que vencen el mismo día en un solo aviso.
            </p>
          </button>
          <button
            onClick={() => setDraft({ ...draft, weeklySummary: !draft.weeklySummary })}
            className={`rounded-2xl border p-4 text-left transition ${
              draft.weeklySummary ? "border-[#bad6bd] bg-[#eff7ed]" : "border-[#e6e4dc] bg-[#faf9f5]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#315542]">Resumen semanal</span>
              <span className={`h-5 w-9 rounded-full p-0.5 ${draft.weeklySummary ? "bg-[#5b9368]" : "bg-[#c9d0c9]"}`}>
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition ${
                    draft.weeklySummary ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-[#7f9182]">
              Recibí un solo resumen con lo que deberías planificar.
            </p>
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[#eee9df] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-[#315542]">Anticipación por categoría</p>
              <p className="mt-1 text-[11px] text-[#8e978f]">Elegí cuándo avisarte antes del vencimiento.</p>
            </div>
            <CalendarDays size={18} className="text-[#6e9b78]" />
          </div>
          <div className="mt-3 divide-y divide-[#f0ede6]">
            {categories.slice(0, 8).map((category) => (
              <div key={category} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[11px] font-semibold text-[#55695c]">{category}</span>
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
                  className="rounded-lg border border-[#e0e6dc] bg-[#fbfcf8] px-2 py-1.5 text-[11px] font-bold text-[#4b7958] outline-none"
                >
                  <option value="1">1 día antes</option>
                  <option value="3">3 días antes</option>
                  <option value="7">7 días antes</option>
                </select>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[#9ba59d]">
            Mostrando las categorías más frecuentes. Las demás usan 3 días por defecto.
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-[#f3f7ee] p-4">
          <div className="flex items-center gap-2 text-[#4a7d58]">
            <Bell size={15} />
            <p className="text-[11px] font-bold">Vista previa de tu resumen</p>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-[#315542]">{summary.title}</p>
          <p className="mt-1 text-[11px] leading-4 text-[#78907d]">{summary.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.groups.slice(0, 3).map((group) => (
              <span key={group.dateKey} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#62806a]">
                {group.dateLabel} · {group.products.length}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#dfe3db] px-4 py-3 text-[12px] font-semibold text-[#657268] hover:bg-[#f6f3ed]"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="flex-1 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#16392c]"
          >
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekCalendar({ products }: { products: Product[] }) {
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const now = new Date();
  const calendar = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(now);
    d.setDate(now.getDate() + index);
    const label = index === 0 ? `Hoy · ${d.getDate()} ${monthNames[d.getMonth()]}` : `${dayNames[d.getDay()]} · ${d.getDate()} ${monthNames[d.getMonth()]}`;
    return { label, index };
  });

  const productsByDay = calendar.map(({ label, index }) => ({
    day: label,
    products: products.filter((product) => product.days === index || (index === 0 && product.days < 0)),
  }));

  return (
    <div className="mt-5 grid gap-2 overflow-x-auto pb-1 sm:grid-cols-7">
      {productsByDay.map(({ day, products: dayProducts }, index) => (
        <div key={day} className={`min-w-[126px] rounded-2xl border p-3 ${index === 0 ? "border-[#c4dec6] bg-[#f0f7ed]" : "border-[#eee9df] bg-[#fffdf9]"}`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#788a7d]">{day}</p>
            {dayProducts.length > 0 && <span className="rounded-full bg-[#e8f1e7] px-1.5 py-0.5 text-[9px] font-bold text-[#5f8969]">{dayProducts.length}</span>}
          </div>
          <div className="mt-3 space-y-2">
            {dayProducts.length ? (
              dayProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => toast(product.name, { description: `${product.category} · ${formatRelativeDays(product.days)}` })}
                  className="w-full rounded-xl bg-[#f7f4ed] p-2 text-left transition hover:bg-[#eaf2e7]"
                >
                  <span className="text-base">{product.icon}</span>
                  <p className="mt-1 truncate text-[10px] font-semibold text-[#395443]">{product.name}</p>
                  <p className="mt-0.5 truncate text-[9px] text-[#9aa49d]">{product.category}</p>
                </button>
              ))
            ) : (
              <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-[#e9e7df] text-center text-[10px] leading-4 text-[#b2b9b1]">Sin urgencias</div>
            )}
          </div>
        </div>
      ))}
    </div>
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[480px] rounded-[28px] border border-white/70 bg-[#fffdf9] p-5 shadow-[0_30px_80px_rgba(13,33,25,0.26)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-serif text-xl font-semibold text-[#17372b]">
              {isEditing ? "Corregir producto" : "Agregar producto"}
            </p>
            <p className="mt-0.5 text-[12px] text-[#8e978f]">Una carga rápida, sin vueltas.</p>
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="rounded-full p-2 text-[#8e978f] hover:bg-[#f3efe7]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Producto</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Queso cremoso"
              className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none transition placeholder:text-[#b2b9b1] focus:border-[#8eb89a] focus:ring-2 focus:ring-[#cfe5d2]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Categoría</span>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Cantidad</span>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej. 2 unidades, 500g"
                className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Fecha de vencimiento</span>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
                className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">¿Qué tipo de fecha es?</span>
              <select
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value as DateLabel)}
                className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]"
              >
                <option value="vencimiento">Fecha de vencimiento</option>
                <option value="elaboración">Fecha de elaboración</option>
                <option value="consumo preferente">Consumo preferente</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-[#e4eadf] bg-[#f6faf3] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold text-[#4f7359]">Vida útil colaborativa</p>
                <p className="mt-0.5 text-[10px] text-[#78907d]">
                  Cambia si el envase está abierto · se valida con {getValidationThreshold()} coincidencias.
                </p>
              </div>
              <select
                value={shelfState}
                onChange={(e) => handleShelfStateChange(e.target.value as ShelfLifeState)}
                className="rounded-lg border border-[#d6e3d4] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#456b50]"
              >
                <option value="cerrado">Cerrado</option>
                <option value="abierto">Abierto</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={shelfDays}
                onChange={(e) => handleShelfDaysChange(Number(e.target.value))}
                className="w-20 rounded-lg border border-[#d6e3d4] bg-white px-2.5 py-2 text-sm font-semibold text-[#294338] outline-none focus:border-[#8eb89a]"
              />
              <span className="text-[11px] text-[#78907d]">días estimados</span>
              <button
                type="button"
                onClick={() => onSuggest?.(name, category, shelfState, shelfDays)}
                className="ml-auto rounded-lg bg-[#dcebd8] px-2.5 py-2 text-[10px] font-bold text-[#4f7359] hover:bg-[#cfe4cb]"
              >
                Sugerir corrección
              </button>
            </div>
          </div>
          {isEditing && (
            <p className="rounded-xl bg-[#eef6ec] px-3 py-2 text-[11px] leading-4 text-[#64816b]">
              Tu corrección se guardará como regla para futuras lecturas de {name}.
            </p>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#dfe3db] px-4 py-3 text-[12px] font-semibold text-[#657268] hover:bg-[#f6f3ed]">
            Cancelar
          </button>
          <button
            disabled={!name.trim()}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#16392c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEditing ? "Guardar corrección" : "Guardar producto"}
          </button>
        </div>
      </div>
    </div>
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
  const expiringProducts = products.filter((product) => product.status === "soon" || product.status === "expired");
  const visibleRecipes = recipes.filter((recipe) => recipeMatchesFilter(recipe, recipeFilter));
  const shownRecipes = visibleRecipes.slice(0, recipeLimit);

  useEffect(() => { saveStoredProducts(storedProducts); }, [storedProducts]);

  useEffect(() => {
    const controller = new AbortController();
    setRecipesLoading(true);
    searchRecipesByIngredients(expiringProducts.map((product) => product.name), controller.signal).then(setRecipes).finally(() => setRecipesLoading(false));
    return () => controller.abort();
  }, [products]);

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

  const suggestShelfLife = (productName: string, category: string, state: ShelfLifeState, days: number) => {
    if (!productName.trim() || !Number.isFinite(days) || days < 1) {
      toast.error("Completá un producto y una cantidad válida de días");
      return;
    }
    const result = submitShelfLifeSuggestion({ productId: `suggestion-${productName.toLowerCase()}`, productName: productName.trim(), category, state, days });
    toast.success(result.validated ? "Vida útil validada por la comunidad" : "Sugerencia guardada", { description: result.validated ? `Se aplicará a futuras estimaciones (${result.userIds.length} coincidencias).` : `Necesita ${result.votesNeeded} coincidencias más para aplicarse.` });
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
    <div className="min-h-screen bg-[#f7f5ef] text-[#1c332b]">
      {consumptionSuccess.length > 0 && <div role="status" className="fixed bottom-5 right-5 z-[60] flex max-w-[340px] items-center gap-3 rounded-2xl border border-[#b9ddbf] bg-[#eff9ee] px-4 py-3 text-[#285b3a] shadow-[0_16px_40px_rgba(31,73,58,0.18)] animate-[freshtrack-success_240ms_cubic-bezier(0.23,1,0.32,1)]"><span className="flex h-8 w-8 animate-[freshtrack-pop_420ms_cubic-bezier(0.23,1,0.32,1)] items-center justify-center rounded-full bg-[#4c9a62] text-white"><Check size={17} strokeWidth={3} /></span><div><p className="text-[11px] font-bold">Ingredientes aprovechados</p><p className="mt-0.5 text-[10px]">{consumptionSuccess.join(", ")} salió de tu despensa.</p></div></div>}
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-[#17372b] px-4 py-5 text-[#e8f0e5] md:flex">
          <div className="flex items-center gap-2.5 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#d9e982] text-[#17372b]"><Leaf size={20} strokeWidth={2.4} /></span><div><p className="font-serif text-[21px] font-bold leading-none tracking-[-0.03em]">freshtrack</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#a5c2a7]">menos desperdicio</p></div></div>
          <button onClick={() => setModal("scan")} className="mt-9 flex items-center justify-center gap-2 rounded-xl bg-[#d9e982] px-3 py-3 text-[12px] font-bold text-[#17372b] shadow-[0_8px_18px_rgba(217,233,130,0.12)] transition hover:bg-[#e5f39c] active:scale-[0.98]"><ScanLine size={16} /> Escanear compra</button>
          {canInstallPWA && (
            <button onClick={() => promptPWAInstall()} className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-[#437559] bg-[#234b36] px-3 py-2 text-[11px] font-bold text-[#e1f0e2] transition hover:bg-[#2d5c43]">
              <Smartphone size={14} /> Instalar app en tu celu
            </button>
          )}
          <p className="mb-2 mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#72927c]">Tu espacio</p>
          <nav className="space-y-1">{currentNavItems.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => navigateToModule(label)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${activeNav === label ? "bg-[#315844] text-white" : "text-[#a4b9a8] hover:bg-[#254b39] hover:text-white"}`}><span className="flex items-center gap-3"><Icon size={16} strokeWidth={1.8} />{label}</span>{count && <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${activeNav === label ? "bg-[#496e55] text-[#eaf4e8]" : "bg-[#254b39] text-[#8eaa91]"}`}>{count}</span>}</button>)}</nav>
          <p className="mb-2 mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#72927c]">Cuenta</p>
          <nav className="space-y-1">
            <button onClick={() => setNotificationModal(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#a4b9a8] transition hover:bg-[#254b39] hover:text-white">
              <Bell size={16} strokeWidth={1.8} />Notificaciones
              {notificationGroups.length > 0 && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#d9e982]" />
                  <span className="text-[10px] text-[#d9e982]">{notificationGroups.length}</span>
                </span>
              )}
            </button>
            <button onClick={() => setNotificationModal(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#a4b9a8] transition hover:bg-[#254b39] hover:text-white">
              <Settings2 size={16} strokeWidth={1.8} />Configuración
            </button>
          </nav>
          <div className="mt-auto rounded-2xl bg-[#204632] p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e982] text-[11px] font-extrabold text-[#17372b]">
                FT
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-white">Despensa local</p>
                <p className="text-[10px] text-[#89a993]">Datos en tu dispositivo</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 md:ml-[244px]">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#ebe8df]/80 bg-[#f7f5ef]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex items-center gap-3"><button className="rounded-xl p-2 text-[#52705e] hover:bg-[#ecebe3] md:hidden" onClick={() => setMobileNav(!mobileNav)}><Menu size={19} /></button><div className="md:hidden"><p className="font-serif text-[20px] font-bold tracking-[-0.04em] text-[#17372b]">freshtrack</p></div><div className="hidden items-center gap-2 text-[11px] text-[#88938a] md:flex"><CalendarDays size={14} />{formatToday()}</div></div>
            <div className="flex items-center gap-2 sm:gap-3">
              {canInstallPWA && (
                <button
                  onClick={() => promptPWAInstall()}
                  className="hidden items-center gap-1.5 rounded-xl border border-[#b4d4bb] bg-[#eef7ed] px-3 py-1.5 text-[11px] font-bold text-[#23583a] shadow-sm transition hover:bg-[#dff0de] sm:flex"
                >
                  <Smartphone size={14} /> Instalar PWA
                </button>
              )}
              <div className="hidden items-center gap-2 rounded-xl border border-[#e6e3db] bg-[#fffdf9] px-3 py-2 text-[#9ca59d] sm:flex"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en tu despensa" className="w-[150px] bg-transparent text-[11px] outline-none placeholder:text-[#aeb5ae]" /></div><button aria-label="Buscar" onClick={() => document.querySelector<HTMLInputElement>("input[placeholder='Buscar en tu despensa']")?.focus()} className="rounded-xl border border-[#e6e3db] bg-[#fffdf9] p-2.5 text-[#75867b] sm:hidden"><Search size={16} /></button><button aria-label="Ayuda" onClick={() => toast("¿Necesitás ayuda?", { description: "Escaneá un ticket y FreshTrack hace el resto." })} className="hidden rounded-xl p-2.5 text-[#75867b] transition hover:bg-[#ecebe3] sm:block"><CircleHelp size={17} /></button><button aria-label="Notificaciones" onClick={() => setNotificationModal(true)} className="relative rounded-xl p-2.5 text-[#75867b] transition hover:bg-[#ecebe3]"><Bell size={17} />{notificationGroups.length > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d79a2b]" />}</button><div className="hidden h-8 w-8 items-center justify-center rounded-full bg-[#d9e982] text-[10px] font-extrabold text-[#17372b] sm:flex" title="Despensa local">FT</div></div>
          </header>

          {mobileNav && <div className="fixed inset-0 z-40 bg-[#142c23]/30 md:hidden" onClick={() => setMobileNav(false)}><div className="h-full w-[260px] bg-[#17372b] p-5 text-white" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-2"><Leaf size={19} className="text-[#d9e982]" /><p className="font-serif text-xl">freshtrack</p></div><button onClick={() => { setModal("scan"); setMobileNav(false); }} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d9e982] px-3 py-3 text-[12px] font-bold text-[#17372b]"><ScanLine size={16} /> Escanear compra</button><div className="mt-6 space-y-1">{currentNavItems.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => { navigateToModule(label); setMobileNav(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[12px] font-semibold text-[#afc4b2]"><span className="flex items-center gap-3"><Icon size={16} />{label}</span>{count && <span>{count}</span>}</button>)}</div></div></div>}

          <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
            <section id="module-summary" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative overflow-hidden rounded-[26px] bg-[#dfead7] px-6 py-7 sm:px-8 sm:py-9"><div className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[28px] border-[#cadfbd]/60" /><div className="absolute -bottom-20 right-16 h-40 w-40 rounded-full border-[20px] border-[#e9f1df]/65" /><div className="relative max-w-[470px]"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#588064]"><span className="h-2 w-2 rounded-full bg-[#7eaf83]" /> Tu despensa, en calma</div><h1 className="mt-4 max-w-[450px] font-serif text-[36px] font-semibold leading-[0.98] tracking-[-0.045em] text-[#17372b] sm:text-[47px]">Que nada rico<br /><span className="italic text-[#4c815c]">termine en la basura.</span></h1><p className="mt-4 max-w-[380px] text-[13px] leading-6 text-[#5d7866]">FreshTrack lee tus tickets, estima vencimientos y te avisa justo a tiempo. Menos carga manual, más comida aprovechada.</p><div className="mt-6 flex flex-wrap items-center gap-2.5"><button onClick={() => setModal("scan")} className="inline-flex items-center gap-2 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white shadow-[0_10px_20px_rgba(31,73,58,0.18)] transition hover:bg-[#16392c] active:scale-[0.97]"><ScanLine size={16} /> Escanear compra</button><button onClick={() => setModal("add")} className="inline-flex items-center gap-2 rounded-xl border border-[#b9d0bb] bg-[#eef5e8]/60 px-4 py-3 text-[12px] font-bold text-[#2c6448] transition hover:bg-white"><Plus size={15} /> Agregar manual</button></div><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-[#5f8167]"><span className="rounded-full bg-[#eff6e9] px-2 py-1">{getCatalogSize()} productos regionales</span><span>·</span><span>vida útil abierto / cerrado</span></div><div className="mt-5 flex items-center gap-2 text-[11px] text-[#6f8978]"><span className="h-1.5 w-1.5 rounded-full bg-[#6cac78]" /><span>Tus datos se guardan únicamente en este dispositivo.</span></div></div></div>
              <div onClick={() => setModal("scan")} className="group relative min-h-[300px] cursor-pointer overflow-hidden rounded-[26px] bg-[#e9e1cf] shadow-[0_14px_35px_rgba(74,79,55,0.09)]"><div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.03]" style={{ backgroundImage: "url('/groceries.jpg')" }} /><div className="absolute inset-0 bg-gradient-to-t from-[#18352a]/80 via-[#18352a]/10 to-transparent" /><div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-[#fffdf9]/85 px-3 py-1.5 text-[10px] font-bold text-[#315542] backdrop-blur-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#6cac78]" /> {lastScan ? `Último escaneo · ${formatTimeAgo(lastScan.at, today)}` : "Sin escaneos recientes"}</div><div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white"><div>{lastScan ? (<><p className="text-[11px] font-medium text-[#d8ead8]">Compra registrada</p><p className="mt-1 font-serif text-[25px] font-semibold tracking-[-0.03em]">{lastScan.count} {lastScan.count === 1 ? "producto detectado" : "productos detectados"}</p></>) : (<><p className="text-[11px] font-medium text-[#d8ead8]">Comenzá ahora</p><p className="mt-1 font-serif text-[25px] font-semibold tracking-[-0.03em]">Escaneá tu primer ticket</p></>)}</div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9e982] text-[#17372b]"><ArrowUpRight size={18} /></div></div></div>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="En tu despensa" value={String(products.length)} note="productos registrados" icon={<PackageOpen size={17} />} tone="bg-[#e6f0e6] text-[#4d835e]" />
              <StatCard label="Por vencer" value={String(soonCount)} note={`en los próximos ${SOON_THRESHOLD_DAYS} días`} icon={<Clock3 size={17} />} tone="bg-[#fbf0d2] text-[#b67d27]" />
              <StatCard label="Ya vencidos" value={String(expiredCount)} note="requieren atención" icon={<Zap size={17} />} tone="bg-[#f8e4dd] text-[#bf644f]" />
              <StatCard label="Desperdicio evitado" value={formatMoney(impact.moneySaved)} note={`${impact.kgSaved} kg este mes (estimado)`} icon={<ArrowDownRight size={17} />} tone="bg-[#e5eee8] text-[#4d835e]" />
            </section>

            {consumptionHistory.length > 0 && <section className="mt-5 rounded-[24px] border border-[#dfe9dc] bg-[#fffdf9] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#719078]">Actividad reciente</p><h2 className="mt-1 font-serif text-[23px] font-semibold text-[#1b392e]">Últimos consumos</h2></div><p className="text-[10px] text-[#829585]">Podés deshacer varias acciones</p></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{consumptionHistory.slice().reverse().map((record) => <div key={record.id} className="rounded-2xl bg-[#f7faf4] p-3"><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-bold text-[#425b4b]">{record.title}</p><span className="text-[9px] text-[#97a698]">{record.createdAt}</span></div><p className="mt-1 text-[10px] text-[#78907d]">{record.ingredients.join(", ") || "Sin coincidencias"}</p><button onClick={() => undoConsumption(record.id)} className="mt-2 rounded-lg border border-[#d9e5d5] px-2 py-1 text-[9px] font-bold text-[#4f805b] hover:bg-white">Deshacer desde acá</button></div>)}</div></section>}

            <section id="module-reports" className="scroll-mt-24 mt-5 rounded-[24px] border border-[#dfe9dc] bg-[#edf6e9] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5b8964]"><ArrowDownRight size={14} /> Impacto de este mes</p><h2 className="mt-2 font-serif text-[26px] font-semibold tracking-[-0.04em] text-[#1b392e]">Pequeños gestos, menos desperdicio.</h2><p className="mt-1 max-w-[500px] text-[11px] leading-5 text-[#708674]">Cada vez que aprovechás algo a tiempo, FreshTrack lo suma. Sin rankings ni presión: solo una señal amable de lo que estás logrando.</p></div><div className="rounded-2xl bg-white/75 px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#86a18a]">Acciones</p><p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#315542]">{impact.actions}</p><p className="text-[10px] text-[#829585]">este mes</p></div></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-semibold text-[#829585]">Comida salvada</p><p className="mt-1 text-xl font-semibold text-[#315542]">{impact.kgSaved} kg</p><p className="text-[9px] text-[#829585]">(estimado)</p></div><div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-semibold text-[#829585]">Valor recuperado</p><p className="mt-1 text-xl font-semibold text-[#315542]">{formatMoney(impact.moneySaved)}</p><p className="text-[9px] text-[#829585]">(estimado)</p></div><div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-semibold text-[#829585]">Comidas posibles</p><p className="mt-1 text-xl font-semibold text-[#315542]">{impact.mealsSaved}</p><p className="text-[9px] text-[#829585]">(estimado)</p></div></div></section>

            <section id="module-pantry" className="scroll-mt-24 mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
              <div className="rounded-[24px] border border-[#ebe8df] bg-[#fffdf9] px-4 py-4 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-[23px] font-semibold tracking-[-0.035em] text-[#1b392e]">
                        {pantryView === "calendar" ? "Próxima semana" : "Por vencer esta semana"}
                      </h2>
                      <span className="rounded-full bg-[#fbf0d2] px-2 py-0.5 text-[10px] font-bold text-[#a67425]">
                        {soonCount} por vencer
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#929b93]">
                      {pantryView === "calendar" ? "Planificá tus comidas viendo qué vence cada día." : "Una mirada rápida para decidir qué consumir primero."}
                    </p>
                  </div>
                  {storedProducts.length > 0 && (
                    <div className="flex items-center gap-1 rounded-xl bg-[#f4f1e9] p-1">
                      <button onClick={() => setPantryView("list")} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${pantryView === "list" ? "bg-white text-[#3c7350] shadow-sm" : "text-[#9aa29a]"}`}>Lista</button>
                      <button onClick={() => setPantryView("calendar")} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${pantryView === "calendar" ? "bg-white text-[#3c7350] shadow-sm" : "text-[#9aa29a]"}`}><CalendarDays size={12} /> Próxima semana</button>
                    </div>
                  )}
                </div>
                {storedProducts.length === 0 ? (
                  <div className="py-12 text-center">
                    <PackageOpen className="mx-auto text-[#b7c2b7]" size={36} />
                    <p className="mt-3 text-base font-semibold text-[#213e32]">Tu despensa está vacía</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-[#78907d]">
                      Tu despensa está vacía. Escaneá un ticket o agregá productos para empezar a controlar vencimientos.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        onClick={() => setModal("scan")}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1f493a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#16392c]"
                      >
                        <ScanLine size={15} /> Escanear compra
                      </button>
                      <button
                        onClick={() => setModal("add")}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#b9d0bb] bg-[#eef5e8]/60 px-4 py-2.5 text-xs font-bold text-[#2c6448] transition hover:bg-white"
                      >
                        <Plus size={15} /> Agregar manual
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const demo = buildDemoProducts(today);
                        setStoredProducts(demo);
                        toast.success("Datos de ejemplo cargados", {
                          description: `${demo.length} productos agregados a tu despensa.`,
                        });
                      }}
                      className="mt-4 text-[11px] font-medium text-[#7c9582] underline transition hover:text-[#2c6448]"
                    >
                      Cargar datos de ejemplo
                    </button>
                  </div>
                ) : pantryView === "calendar" ? (
                  <WeekCalendar products={products} />
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeae1] pb-3">
                      {/* Status Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <button
                          onClick={() => setFilter("all")}
                          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            filter === "all" ? "bg-[#edf4e9] text-[#3c7350]" : "text-[#9aa29a] hover:bg-[#f6f4ed]"
                          }`}
                        >
                          Todos ({products.length})
                        </button>
                        <button
                          onClick={() => setFilter("soon")}
                          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            filter === "soon" ? "bg-[#fbf0d2] text-[#a67425]" : "text-[#9aa29a] hover:bg-[#f6f4ed]"
                          }`}
                        >
                          Por vencer ({soonCount})
                        </button>
                        <button
                          onClick={() => setFilter("expired")}
                          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            filter === "expired" ? "bg-[#f9e5df] text-[#a94c3c]" : "text-[#9aa29a] hover:bg-[#f6f4ed]"
                          }`}
                        >
                          Vencidos ({expiredCount})
                        </button>
                      </div>

                      {/* Advanced Filters: Category & Sorting */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          <SlidersHorizontal size={13} className="text-[#7c8c80]" />
                          <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="rounded-lg border border-[#e2ddd3] bg-white px-2 py-1 text-[11px] font-semibold text-[#446450] outline-none"
                            aria-label="Filtrar por categoría"
                          >
                            <option value="all">Todas las categorías</option>
                            {ALL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <ArrowUpDown size={13} className="text-[#7c8c80]" />
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="rounded-lg border border-[#e2ddd3] bg-white px-2 py-1 text-[11px] font-semibold text-[#446450] outline-none"
                            aria-label="Ordenar productos"
                          >
                            <option value="expiry-asc">Vencimiento: más próximo</option>
                            <option value="expiry-desc">Vencimiento: más lejano</option>
                            <option value="name-asc">Nombre: A → Z</option>
                            <option value="name-desc">Nombre: Z → A</option>
                            <option value="category">Categoría</option>
                          </select>
                        </div>

                        {(categoryFilter !== "all" || sortBy !== "expiry-asc") && (
                          <button
                            onClick={() => {
                              setCategoryFilter("all");
                              setSortBy("expiry-asc");
                            }}
                            className="text-[10px] font-semibold text-[#a55243] hover:underline"
                          >
                            Restablecer
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1">
                      {(showAllPantry ? filteredProducts : filteredProducts.slice(0, 5)).map((product) => (
                        <ProductRow key={product.id} product={product} onEdit={setSelectedProduct} />
                      ))}
                      {filteredProducts.length > 5 && (
                        <button
                          onClick={() => setShowAllPantry(!showAllPantry)}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#dfe3db] bg-[#fbfaf6] py-2.5 text-[11px] font-bold text-[#3c7350] transition hover:bg-white"
                        >
                          {showAllPantry ? "Mostrar menos productos" : `Mostrar todos los productos (${filteredProducts.length} en total)`}
                        </button>
                      )}
                      {filteredProducts.length === 0 && (
                        <div className="py-10 text-center">
                          <PackageOpen className="mx-auto text-[#b7c2b7]" size={28} />
                          <p className="mt-2 text-sm font-semibold text-[#607369]">No encontramos productos con los filtros actuales</p>
                          <p className="mt-1 text-[11px] text-[#9aa29a]">Probá cambiar el filtro o tu búsqueda.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-[24px] border border-[#ebe8df] bg-[#fffdf9] p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-serif text-[23px] font-semibold tracking-[-0.035em] text-[#1b392e]">Estado general</h2>
                    <p className="mt-1 text-[11px] text-[#929b93]">
                      {okPercent >= 80 ? "Tu despensa está bastante bien." : "Tenés productos que requieren consumo pronto."}
                    </p>
                  </div>
                  <button onClick={() => navigateToModule("Reportes")} className="rounded-lg p-1.5 text-[#a0aaa0] hover:bg-[#f5f3ec]"><MoreHorizontal size={17} /></button>
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <div className="relative flex h-[136px] w-[136px] shrink-0 items-center justify-center rounded-full" style={{ background: totalTracked > 0 ? `conic-gradient(#5d9b72 0 ${pOk}%, #e3aa36 ${pOk}% ${pSoon}%, #d66f5b ${pSoon}% 100%)` : "#5d9b72" }}>
                    <div className="flex h-[94px] w-[94px] flex-col items-center justify-center rounded-full bg-[#fffdf9]">
                      <p className="text-[28px] font-semibold tracking-[-0.06em] text-[#1f493a]">{okPercent}%</p>
                      <p className="text-[10px] text-[#8c968e]">en fecha</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[["En fecha", okCount, "#5d9b72"], ["Por vencer", soonCount, "#e3aa36"], ["Vencidos", expiredCount, "#d66f5b"]].map(([label, count, color]) => (
                      <div key={label as string} className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color as string }} />
                        <div>
                          <p className="text-[11px] font-semibold text-[#506258]">{label}</p>
                          <p className="text-[10px] text-[#9ca49d]">{count} productos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 rounded-2xl bg-[#f3f7ee] p-3.5">
                  <div className="flex items-center gap-2 text-[#4a7d58]">
                    <Sparkles size={15} />
                    <p className="text-[11px] font-bold">Tip de FreshTrack</p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-[#728776]">
                    Consumí primero lo que está en amarillo. Así evitás que llegue al rojo.
                  </p>
                </div>
              </div>
            </section>

            {/* Smart Shopping List Module */}
            <ShoppingListModule
              shoppingList={shoppingList}
              setShoppingList={setShoppingList}
              pantryProducts={products}
              consumptionHistory={consumptionHistory}
              onAddProductsToPantry={addProducts}
              detectIconFn={detectProductIcon}
            />

            <section id="module-route" className="scroll-mt-24 mt-5 grid gap-5 md:grid-cols-[1fr_1fr]">
              <div className="rounded-[24px] bg-[#17372b] p-5 text-white sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ebea0]"><Route size={13} /> Recorrida sugerida</p>
                    <h2 className="mt-2 font-serif text-[25px] font-semibold tracking-[-0.035em]">Cosas para resolver primero.</h2>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315844] text-[#d9e982]"><MapPin size={18} /></div>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {suggestedRoute.length > 0 ? (
                    suggestedRoute.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          setSelectedProduct(item.product);
                          toast(item.name, { description: `Ubicación: ${item.place} · ${formatRelativeDays(item.product.days)}` });
                        }}
                        className="group rounded-xl bg-[#204632] p-3 text-left transition hover:bg-[#2a5740]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#d9e982] text-[10px] font-extrabold text-[#17372b]">{item.number}</span>
                          <ArrowUpRight size={14} className="text-[#75977d] transition group-hover:text-[#d9e982]" />
                        </div>
                        <p className="mt-4 truncate text-[11px] font-semibold text-white">{item.name}</p>
                        <p className="mt-1 truncate text-[10px] text-[#8fb096]">{item.place}</p>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-3 py-4 text-center text-xs text-[#89a993]">Tu despensa está al día sin urgencias.</div>
                  )}
                </div>
                <button onClick={() => navigateToModule("Mi despensa")} className="mt-5 flex items-center gap-1 text-[11px] font-bold text-[#d9e982] hover:text-white">Ver despensa completa <ChevronRight size={14} /></button>
              </div>

              <div className="rounded-[24px] border border-[#ebe8df] bg-[#f1eadc] p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a28153]"><Utensils size={13} /> Ideas para aprovechar</p>
                    <h2 className="mt-2 max-w-[300px] font-serif text-[25px] font-semibold leading-[1.05] tracking-[-0.035em] text-[#503c26]">Recetas con lo que vence primero.</h2>
                  </div>
                  <div className="text-4xl">🥬</div>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-[#806c53]">
                  {recipesLoading
                    ? "Buscando opciones que aprovechen tu despensa…"
                    : visibleRecipes.length > 0 || recipes.length > 0
                    ? `Encontramos ${visibleRecipes.length || recipes.length} ideas para usar antes de que se pierdan.`
                    : "No encontramos recetas para los productos actuales."}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {([["all", "Todas"], ["vegetarian", "Vegetarianas"], ["glutenFree", "Sin TACC"], ["quick", "Rápidas"]] as Array<[RecipeFilter, string]>).map(([value, label]) => (
                    <button key={value} onClick={() => setRecipeFilter(value)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${recipeFilter === value ? "bg-[#fffdf9] text-[#765a35] shadow-sm" : "bg-[#eadfc9]/70 text-[#a28b6b] hover:bg-[#fffdf9]"}`}>{label}</button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  {shownRecipes.map((recipe) => (
                    <div key={recipe.id} data-testid="recipe-card" role="button" tabIndex={0} aria-label={`Ver detalle de ${recipe.title}`} onClick={() => openRecipeDetail(recipe)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openRecipeDetail(recipe); }} className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white/60 p-2 transition hover:bg-white">
                      <img src={recipe.image} alt={recipe.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-[#5a452c]">{recipe.title}</p>
                        <p className="mt-0.5 truncate text-[10px] text-[#967e61]">Usa: {recipe.matchedIngredients.join(", ")}</p>
                        <p className="mt-0.5 text-[9px] font-semibold text-[#a28153]">Ver ingredientes y pasos</p>
                      </div>
                      <button onClick={(event) => { event.stopPropagation(); initiateRecipeConsumption(recipe); }} className="shrink-0 rounded-lg bg-[#ead7b8] px-2 py-1.5 text-[9px] font-bold text-[#765a35] transition hover:bg-[#dfc79f]">Aproveché</button>
                    </div>
                  ))}
                </div>
                {recipeLimit < visibleRecipes.length && (
                  <button onClick={() => setRecipeLimit((limit) => Math.min(limit + 3, visibleRecipes.length))} className="mt-4 w-full rounded-xl border border-[#d7c6a6] bg-[#fffdf9]/70 px-3 py-2.5 text-[11px] font-bold text-[#765a35] transition hover:bg-white">Cargar más ({visibleRecipes.length - recipeLimit} disponibles)</button>
                )}
                <p className="mt-3 text-[9px] text-[#aa967b]">Fuente: TheMealDB · sugerencias orientativas</p>
              </div>
            </section>

            <footer className="flex flex-col gap-2 pb-2 pt-8 text-[10px] text-[#a0a79f] sm:flex-row sm:items-center sm:justify-between"><p>FreshTrack · Menos desperdicio, más tranquilidad.</p><p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#75a879]" /> Datos guardados localmente</p></footer>
          </div>
        </main>
      </div>

      {modal === "scan" && (
        <ScanModal
          onClose={() => setModal(null)}
          onComplete={addProducts}
          detectIconFn={detectProductIcon}
        />
      )}
      {modal === "add" && <AddProductModal onClose={() => { setModal(null); setEditingProduct(null); }} onAdd={addProduct} initialProduct={editingProduct || undefined} onCorrection={correctProduct} onSuggest={suggestShelfLife} today={today} />}
      {recipeDetail && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center"><div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[28px] bg-[#fffdf9] shadow-[0_30px_80px_rgba(13,33,25,0.26)]"><div className="relative h-40 overflow-hidden rounded-t-[28px] bg-[#e8dfcf]"><img src={recipeDetail.image} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#17372b]/75 to-transparent" /><button aria-label="Cerrar receta" onClick={() => setRecipeDetail(null)} className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[#315542] backdrop-blur-sm"><X size={17} /></button><div className="absolute bottom-4 left-5 right-5"><p className="font-serif text-2xl font-semibold text-white">{recipeDetail.title}</p><p className="mt-1 text-[10px] text-[#dcebdd]">{recipeDetail.area || "Receta sugerida"}{recipeDetail.category ? ` · ${recipeDetail.category}` : ""}</p></div></div>{recipeDetailLoading ? <div className="p-6 text-center text-sm text-[#718273]">Cargando ingredientes y pasos…</div> : <div className="p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#719078]">Ingredientes</p><div className="mt-3 space-y-2">{(recipeDetail.ingredients || recipeDetail.matchedIngredients.map((name) => ({ name, measure: "a gusto" }))).map((ingredient) => <div key={`${ingredient.name}-${ingredient.measure}`} className="flex items-start justify-between gap-3 border-b border-[#f0ede6] pb-2 text-[11px]"><span className="font-semibold text-[#425b4b]">{ingredient.name}</span><span className="text-right text-[#9a8b75]">{ingredient.measure}</span></div>)}</div></div><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#719078]">Paso a paso</p><div className="mt-3 space-y-3">{(recipeDetail.instructions || "Prepará los ingredientes, cociná hasta que estén tiernos y serví caliente.").split(/\r?\n+/).filter(Boolean).map((step, index) => <div key={`${index}-${step.slice(0, 8)}`} className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e6f0e6] text-[10px] font-bold text-[#4d835e]">{index + 1}</span><p className="text-[11px] leading-5 text-[#6e7d70]">{step}</p></div>)}</div></div></div><button data-testid="consume-recipe" onClick={() => { initiateRecipeConsumption(recipeDetail); setRecipeDetail(null); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#16392c]"><Check size={15} /> Aproveché esta receta</button></div>}</div></div>}
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
      {selectedProduct && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/30 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[370px] rounded-[26px] bg-[#fffdf9] p-5 shadow-[0_30px_80px_rgba(13,33,25,0.2)]"><div className="flex items-start gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f1e7] text-2xl">{selectedProduct.icon}</span><div className="min-w-0 flex-1"><p className="font-serif text-xl font-semibold text-[#17372b]">{selectedProduct.name}</p><p className="mt-1 text-[11px] text-[#90998f]">{selectedProduct.category} · {selectedProduct.quantity}</p></div><button onClick={() => setSelectedProduct(null)} className="text-[#9ba49c] hover:text-[#17372b]"><X size={17} /></button></div><div className="mt-5 rounded-2xl bg-[#f7f4ed] p-3.5"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-[#7f8980]">{labelForDisplay(selectedProduct.dateLabel || "desconocida")}</span><MiniStatus status={selectedProduct.status} /></div><p className="mt-2 text-lg font-semibold text-[#294338]">{selectedProduct.expiry}</p><p className="mt-1 text-[11px] text-[#8d978f]">{formatRelativeDays(selectedProduct.days)}</p>{selectedProduct.corrected && <p className="mt-2 text-[10px] font-semibold text-[#4e815b]">✓ Corrección aplicada a futuras detecciones</p>}</div><div className="mt-4 flex gap-2"><button onClick={() => { setEditingProduct(selectedProduct); setSelectedProduct(null); setModal("add"); }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe3db] px-3 py-2.5 text-[11px] font-bold text-[#657268] hover:bg-[#f6f3ed]"><Pencil size={14} /> Corregir</button><button onClick={removeSelected} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f9e5df] px-3 py-2.5 text-[11px] font-bold text-[#a94c3c] hover:bg-[#f4d8d0]"><Trash2 size={14} /> Eliminar</button></div></div></div>}
    </div>
  );
}
