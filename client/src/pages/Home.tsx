import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Home as HomeIcon,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  Route,
  ScanLine,
  Search,
  Settings2,
  Sparkles,
  Store,
  Trash2,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { DateLabel, detectDateCandidates, getLearningRule, labelForDisplay, saveLearningCorrection } from "@/lib/dateRecognition";
import { estimateShelfLife, getCatalogSize, getValidationThreshold, ShelfLifeState, submitShelfLifeSuggestion } from "@/lib/shelfLifeCatalog";
import { buildWeeklySummary, defaultNotificationPreferences, getCategoryLeadDays, groupNotifications, loadNotificationPreferences, NotificationPreferences, saveNotificationPreferences } from "@/lib/notificationRules";
import { getRecipeDetails, RecipeSuggestion, searchRecipesByIngredients } from "@/lib/recipeApi";
import { formatMoney, ImpactStats, loadImpactStats, recordImpact } from "@/lib/impactStats";

type ProductStatus = "ok" | "soon" | "expired";
type Product = {
  id: number;
  name: string;
  category: string;
  expiry: string;
  days: number;
  quantity: string;
  status: ProductStatus;
  icon: string;
  location?: string;
  estimated?: boolean;
  dateLabel?: DateLabel;
  corrected?: boolean;
};

const initialProducts: Product[] = [
  { id: 1, name: "Yogur natural", category: "Lácteos", expiry: "18 sep", days: 3, quantity: "4 unidades", status: "soon", icon: "🥣", estimated: true, dateLabel: "vencimiento" },
  { id: 2, name: "Espinaca fresca", category: "Frutas y verduras", expiry: "19 sep", days: 4, quantity: "1 atado", status: "soon", icon: "🥬" },
  { id: 3, name: "Pechuga de pollo", category: "Carnes", expiry: "21 sep", days: 6, quantity: "2 unidades", status: "ok", icon: "🍗" },
  { id: 4, name: "Pan de molde", category: "Panadería", expiry: "24 sep", days: 9, quantity: "1 paquete", status: "ok", icon: "🍞" },
  { id: 5, name: "Tomates cherry", category: "Frutas y verduras", expiry: "16 sep", days: 1, quantity: "1 bandeja", status: "soon", icon: "🍅" },
  { id: 6, name: "Leche entera", category: "Lácteos", expiry: "14 sep", days: -1, quantity: "2 litros", status: "expired", icon: "🥛" },
  { id: 7, name: "Pasta seca", category: "Almacén", expiry: "12 ago 27", days: 331, quantity: "2 paquetes", status: "ok", icon: "🍝" },
];

const navItems = [
  { label: "Resumen", icon: HomeIcon },
  { label: "Mi despensa", icon: PackageOpen, count: "24" },
  { label: "Recorrida", icon: Route, count: "3" },
  { label: "Reportes", icon: BarChart3 },
];

const statusCopy: Record<ProductStatus, { label: string; color: string; dot: string }> = {
  ok: { label: "En fecha", color: "text-[#43715b] bg-[#e7f1e9]", dot: "bg-[#5d9b72]" },
  soon: { label: "Por vencer", color: "text-[#9b6b19] bg-[#fbf0d2]", dot: "bg-[#e3aa36]" },
  expired: { label: "Vencido", color: "text-[#a94c3c] bg-[#f9e5df]", dot: "bg-[#d66f5b]" },
};

function formatToday() {
  return "martes, 15 de septiembre";
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

function ProductRow({ product, onRemove, onEdit }: { product: Product; onRemove: (id: number) => void; onEdit: (product: Product) => void }) {
  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_110px_92px_28px] items-center gap-3 border-b border-[#ece8df] py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f1e7] text-xl">{product.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1c332b]">{product.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#8a928b]">{product.quantity} · {product.category}</p>
        </div>
      </div>
      <div className="text-left">
        <p className="text-[12px] font-semibold text-[#34473e]">{product.expiry}</p>
        <p className="mt-0.5 text-[11px] text-[#9aa098]">{product.days < 0 ? "hace 1 día" : `en ${product.days} días`}</p>
      </div>
      <MiniStatus status={product.status} />
      <div className="relative flex justify-end">
        <button aria-label={`Acciones para ${product.name}`} onClick={() => onEdit(product)} className="rounded-lg p-1.5 text-[#a2aaa2] opacity-0 transition group-hover:opacity-100 hover:bg-[#f4f1e9] hover:text-[#1f493a]">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, note, icon, tone, trend }: { label: string; value: string; note: string; icon: React.ReactNode; tone: string; trend?: "up" | "down" }) {
  return (
    <div className="rounded-[20px] border border-[#ece8df] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(55,63,48,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(55,63,48,0.08)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
        {trend && <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend === "down" ? "text-[#43715b]" : "text-[#c7802d]"}`}>{trend === "down" ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />} {trend === "down" ? "12%" : "8%"}</span>}
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-[#929991]">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-[#1c332b]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#8d968e]">{note}</p>
    </div>
  );
}

function ScanModal({ onClose, onComplete }: { onClose: () => void; onComplete: (products: Product[]) => void }) {
  const [stage, setStage] = useState<"choose" | "scanning" | "results">("choose");
  const [scanMode, setScanMode] = useState<"ticket" | "label">("ticket");
  const sampleOcrText = "ELAB: 02/09/2026 · VENCE: 18/09/2026 · CONSUMIR PREFERENTEMENTE ANTES DE: 20/09/2026";
  const detectedDates = detectDateCandidates(sampleOcrText, getLearningRule("Yogur natural", "Lácteos"));
  const selectedExpiryLabel = detectedDates.find((candidate) => candidate.label === "vencimiento")?.label || "vencimiento";
  const selectedPreferredLabel = detectedDates.find((candidate) => candidate.label === "consumo preferente")?.label || "consumo preferente";
  const scannedProducts: Product[] = [
    { id: 101, name: "Yogur natural", category: "Lácteos", expiry: "18 sep", days: 3, quantity: "4 unidades", status: "soon", icon: "🥣", estimated: true, dateLabel: selectedExpiryLabel },
    { id: 102, name: "Bananas", category: "Frutas y verduras", expiry: "20 sep", days: 5, quantity: "1 kg", status: "ok", icon: "🍌", estimated: true, dateLabel: selectedPreferredLabel },
    { id: 103, name: "Arroz largo fino", category: "Almacén", expiry: "15 sep 27", days: 365, quantity: "1 paquete", status: "ok", icon: "🍚", estimated: true, dateLabel: "vencimiento" },
  ];

  const startScan = () => {
    setStage("scanning");
    window.setTimeout(() => setStage("results"), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/70 bg-[#fffdf9] shadow-[0_30px_80px_rgba(13,33,25,0.26)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#eee9df] px-5 py-4">
          <div>
            <p className="font-serif text-xl font-semibold text-[#17372b]">Nueva carga inteligente</p>
            <p className="mt-0.5 text-[12px] text-[#8e978f]">Listo en menos de 3 segundos</p>
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="rounded-full p-2 text-[#8e978f] transition hover:bg-[#f3efe7] hover:text-[#17372b]"><X size={18} /></button>
        </div>

        {stage === "choose" && (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f0e7] p-1">
              <button onClick={() => setScanMode("ticket")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${scanMode === "ticket" ? "bg-white text-[#1f493a] shadow-sm" : "text-[#929990]"}`}><ReceiptText size={15} /> Ticket de compra</button>
              <button onClick={() => setScanMode("label")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${scanMode === "label" ? "bg-white text-[#1f493a] shadow-sm" : "text-[#929990]"}`}><ScanLine size={15} /> Etiqueta</button>
            </div>
            <div className="mt-5 rounded-[22px] border border-dashed border-[#bad0c0] bg-[#f3f8f1] px-5 py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfeee1] text-[#2d6a4f]"><Camera size={25} strokeWidth={1.7} /></div>
              <p className="mt-4 text-sm font-semibold text-[#1d4234]">{scanMode === "ticket" ? "Escaneá tu ticket" : "Enfocá la fecha de vencimiento"}</p>
              <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-5 text-[#7b8e80]">{scanMode === "ticket" ? "Detectamos productos, cantidades y estimamos fechas automáticamente." : "Buscamos patrones como VENCE, EXP o CONS. PREF."}</p>
              <button onClick={startScan} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1f493a] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(31,73,58,0.18)] transition hover:bg-[#16392c] active:scale-[0.97]"><ScanLine size={15} /> Simular escaneo</button>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8e978f]"><Sparkles size={12} className="text-[#d6a143]" /> El OCR procesa todo en tu dispositivo</p>
          </div>
        )}

        {stage === "scanning" && (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#e5f0e5] text-[#2d6a4f]"><LoaderCircle size={37} className="animate-spin" strokeWidth={1.5} /><span className="absolute inset-0 animate-ping rounded-[24px] border border-[#9fc4a7] opacity-30" /></div>
            <p className="mt-6 font-serif text-2xl font-semibold text-[#17372b]">Leyendo tu compra...</p>
            <p className="mt-2 text-[12px] text-[#87948a]">Identificando productos y fechas estimadas</p>
            <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-[#e6eee5]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#5d9b72]" /></div>
          </div>
        )}

        {stage === "results" && (
          <div className="p-5">
            <div className="flex items-start gap-3 rounded-2xl bg-[#e7f1e9] p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#cae3cf] text-[#2d6a4f]"><Check size={18} /></div><div><p className="text-sm font-semibold text-[#1e4b38]">3 productos detectados</p><p className="mt-0.5 text-[11px] leading-4 text-[#6f8978]">Las fechas sin impresión se estimaron según categoría.</p></div></div>
            <div className="mt-4 divide-y divide-[#eee9df] rounded-2xl border border-[#eee9df] px-3">{scannedProducts.map((product) => <div key={product.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f1e7] text-lg">{product.icon}</span><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#294338]">{product.name}</p><p className="mt-0.5 text-[11px] text-[#90988f]">{labelForDisplay(product.dateLabel || "desconocida")} · {product.expiry}</p><p className="mt-0.5 text-[10px] text-[#6d9076]">{product.estimated ? "estimado por vida útil" : "detectado junto a la fecha"}</p></div><MiniStatus status={product.status} /></div>)}</div>
            <div className="mt-5 flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl border border-[#dfe3db] px-4 py-3 text-[12px] font-semibold text-[#657268] transition hover:bg-[#f6f3ed]">Revisar después</button><button onClick={() => { onComplete(scannedProducts); onClose(); }} className="flex-1 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#16392c] active:scale-[0.97]">Agregar a despensa</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationSettingsModal({ onClose, products, preferences, onSave }: { onClose: () => void; products: Product[]; preferences: NotificationPreferences; onSave: (preferences: NotificationPreferences) => void }) {
  const [draft, setDraft] = useState(preferences);
  const summary = buildWeeklySummary(products.map(({ id, name, category, expiry, days, status }) => ({ id, name, category, expiry, days, status })), draft);
  const categories = Object.keys(defaultNotificationPreferences.categoryLeadDays);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center"><div className="max-h-[90vh] w-full max-w-[580px] overflow-y-auto rounded-[28px] border border-white/70 bg-[#fffdf9] p-5 shadow-[0_30px_80px_rgba(13,33,25,0.26)]"><div className="flex items-start justify-between"><div><p className="font-serif text-xl font-semibold text-[#17372b]">Notificaciones inteligentes</p><p className="mt-0.5 text-[12px] text-[#8e978f]">Menos avisos, mejor momento.</p></div><button aria-label="Cerrar" onClick={onClose} className="rounded-full p-2 text-[#8e978f] hover:bg-[#f3efe7]"><X size={18} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => setDraft({ ...draft, enabled: !draft.enabled })} className={`rounded-2xl border p-4 text-left transition ${draft.enabled ? "border-[#bad6bd] bg-[#eff7ed]" : "border-[#e6e4dc] bg-[#faf9f5]"}`}><div className="flex items-center justify-between"><span className="text-[12px] font-bold text-[#315542]">Alertas agrupadas</span><span className={`h-5 w-9 rounded-full p-0.5 ${draft.enabled ? "bg-[#5b9368]" : "bg-[#c9d0c9]"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${draft.enabled ? "translate-x-4" : "translate-x-0"}`} /></span></div><p className="mt-1.5 text-[11px] leading-4 text-[#7f9182]">Agrupa productos que vencen el mismo día en un solo aviso.</p></button><button onClick={() => setDraft({ ...draft, weeklySummary: !draft.weeklySummary })} className={`rounded-2xl border p-4 text-left transition ${draft.weeklySummary ? "border-[#bad6bd] bg-[#eff7ed]" : "border-[#e6e4dc] bg-[#faf9f5]"}`}><div className="flex items-center justify-between"><span className="text-[12px] font-bold text-[#315542]">Resumen semanal</span><span className={`h-5 w-9 rounded-full p-0.5 ${draft.weeklySummary ? "bg-[#5b9368]" : "bg-[#c9d0c9]"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${draft.weeklySummary ? "translate-x-4" : "translate-x-0"}`} /></span></div><p className="mt-1.5 text-[11px] leading-4 text-[#7f9182]">Recibí un solo resumen con lo que deberías planificar.</p></button></div><div className="mt-5 rounded-2xl border border-[#eee9df] p-4"><div className="flex items-center justify-between"><div><p className="text-[12px] font-bold text-[#315542]">Anticipación por categoría</p><p className="mt-1 text-[11px] text-[#8e978f]">Elegí cuándo avisarte antes del vencimiento.</p></div><CalendarDays size={18} className="text-[#6e9b78]" /></div><div className="mt-3 divide-y divide-[#f0ede6]">{categories.slice(0, 8).map((category) => <div key={category} className="flex items-center justify-between gap-3 py-2.5"><span className="text-[11px] font-semibold text-[#55695c]">{category}</span><select value={draft.categoryLeadDays[category] || 3} onChange={(e) => setDraft({ ...draft, categoryLeadDays: { ...draft.categoryLeadDays, [category]: Number(e.target.value) as 1 | 3 | 7 } })} className="rounded-lg border border-[#e0e6dc] bg-[#fbfcf8] px-2 py-1.5 text-[11px] font-bold text-[#4b7958] outline-none"><option value="1">1 día antes</option><option value="3">3 días antes</option><option value="7">7 días antes</option></select></div>)}</div><p className="mt-3 text-[10px] text-[#9ba59d]">Mostrando las categorías más frecuentes. Las demás usan 3 días por defecto.</p></div><div className="mt-5 rounded-2xl bg-[#f3f7ee] p-4"><div className="flex items-center gap-2 text-[#4a7d58]"><Bell size={15} /><p className="text-[11px] font-bold">Vista previa de tu resumen</p></div><p className="mt-1.5 text-[12px] font-semibold text-[#315542]">{summary.title}</p><p className="mt-1 text-[11px] leading-4 text-[#78907d]">{summary.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{summary.groups.slice(0, 3).map((group) => <span key={group.dateKey} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#62806a]">{group.dateLabel} · {group.products.length}</span>)}</div></div><div className="mt-5 flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl border border-[#dfe3db] px-4 py-3 text-[12px] font-semibold text-[#657268] hover:bg-[#f6f3ed]">Cancelar</button><button onClick={() => { onSave(draft); onClose(); }} className="flex-1 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#16392c]">Guardar preferencias</button></div></div></div>;
}

function WeekCalendar({ products }: { products: Product[] }) {
  const calendar = ["Hoy · 15 sep", "Mie · 16 sep", "Jue · 17 sep", "Vie · 18 sep", "Sáb · 19 sep", "Dom · 20 sep", "Lun · 21 sep"];
  const productsByDay = calendar.map((day, index) => ({ day, products: products.filter((product) => product.days === index || (index === 0 && product.days < 0)) }));
  return <div className="mt-5 grid gap-2 overflow-x-auto pb-1 sm:grid-cols-7">{productsByDay.map(({ day, products: dayProducts }, index) => <div key={day} className={`min-w-[126px] rounded-2xl border p-3 ${index === 0 ? "border-[#c4dec6] bg-[#f0f7ed]" : "border-[#eee9df] bg-[#fffdf9]"}`}><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#788a7d]">{day}</p>{dayProducts.length > 0 && <span className="rounded-full bg-[#e8f1e7] px-1.5 py-0.5 text-[9px] font-bold text-[#5f8969]">{dayProducts.length}</span>}</div><div className="mt-3 space-y-2">{dayProducts.length ? dayProducts.map((product) => <button key={product.id} onClick={() => toast(product.name, { description: `${product.category} · ${product.days < 0 ? "vencido" : `vence en ${product.days} días`}` })} className="w-full rounded-xl bg-[#f7f4ed] p-2 text-left transition hover:bg-[#eaf2e7]"><span className="text-base">{product.icon}</span><p className="mt-1 truncate text-[10px] font-semibold text-[#395443]">{product.name}</p><p className="mt-0.5 truncate text-[9px] text-[#9aa49d]">{product.category}</p></button>) : <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-[#e9e7df] text-center text-[10px] leading-4 text-[#b2b9b1]">Sin urgencias</div>}</div></div>)}</div>;
}

function AddProductModal({ onClose, onAdd, initialProduct, onCorrection, onSuggest }: { onClose: () => void; onAdd: (product: Product) => void; initialProduct?: Product; onCorrection?: (product: Product, nextLabel: DateLabel, nextCategory: string, nextExpiry: string) => void; onSuggest?: (productName: string, category: string, state: ShelfLifeState, days: number) => void }) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [category, setCategory] = useState(initialProduct?.category || "Almacén");
  const [expiry, setExpiry] = useState(initialProduct?.expiry || "20 sep");
  const [dateLabel, setDateLabel] = useState<DateLabel>(initialProduct?.dateLabel || "vencimiento");
  const [shelfState, setShelfState] = useState<ShelfLifeState>("cerrado");
  const [shelfDays, setShelfDays] = useState(() => estimateShelfLife(initialProduct?.name || "", "cerrado", initialProduct?.category)?.days || 7);
  const isEditing = Boolean(initialProduct);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[460px] rounded-[28px] border border-white/70 bg-[#fffdf9] p-5 shadow-[0_30px_80px_rgba(13,33,25,0.26)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between"><div><p className="font-serif text-xl font-semibold text-[#17372b]">Agregar producto</p><p className="mt-0.5 text-[12px] text-[#8e978f]">Una carga rápida, sin vueltas.</p></div><button aria-label="Cerrar" onClick={onClose} className="rounded-full p-2 text-[#8e978f] hover:bg-[#f3efe7]"><X size={18} /></button></div>
        <div className="mt-5 space-y-3"><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Producto</span><input autoFocus value={name} onChange={(e) => { setName(e.target.value); const estimate = estimateShelfLife(e.target.value, shelfState, category); if (estimate) setShelfDays(estimate.days); }} placeholder="Ej. Queso cremoso" className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none transition placeholder:text-[#b2b9b1] focus:border-[#8eb89a] focus:ring-2 focus:ring-[#cfe5d2]" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Categoría</span><select value={category} onChange={(e) => { setCategory(e.target.value); const estimate = estimateShelfLife(name, shelfState, e.target.value); if (estimate) setShelfDays(estimate.days); }} className="w-full appearance-none rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]"><option>Almacén</option><option>Lácteos</option><option>Fiambres y embutidos</option><option>Verduras frescas</option><option>Frutas frescas</option><option>Enlatados y conservas</option><option>Carnes</option><option>Panadería</option></select></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">Fecha encontrada</span><input value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]" /></label></div><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#829087]">¿Qué tipo de fecha es?</span><select value={dateLabel} onChange={(e) => setDateLabel(e.target.value as DateLabel)} className="w-full rounded-xl border border-[#e3e6de] bg-[#fbfaf6] px-3.5 py-3 text-sm text-[#213e32] outline-none focus:border-[#8eb89a]"><option value="vencimiento">Fecha de vencimiento</option><option value="elaboración">Fecha de elaboración</option><option value="consumo preferente">Consumir preferentemente antes de</option></select></label><div className="rounded-2xl border border-[#e4eadf] bg-[#f6faf3] p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-[11px] font-bold text-[#4f7359]">Vida útil colaborativa</p><p className="mt-0.5 text-[10px] text-[#78907d]">La vida cambia si el envase está abierto · se valida con {getValidationThreshold()} coincidencias.</p></div><select value={shelfState} onChange={(e) => { const next = e.target.value as ShelfLifeState; setShelfState(next); const estimate = estimateShelfLife(name, next, category); if (estimate) setShelfDays(estimate.days); }} className="rounded-lg border border-[#d6e3d4] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#456b50]"><option value="cerrado">Cerrado</option><option value="abierto">Abierto</option></select></div><div className="mt-3 flex items-center gap-2"><input type="number" min="1" value={shelfDays} onChange={(e) => setShelfDays(Number(e.target.value))} className="w-20 rounded-lg border border-[#d6e3d4] bg-white px-2.5 py-2 text-sm font-semibold text-[#294338] outline-none focus:border-[#8eb89a]" /><span className="text-[11px] text-[#78907d]">días estimados</span><button type="button" onClick={() => onSuggest?.(name, category, shelfState, shelfDays)} className="ml-auto rounded-lg bg-[#dcebd8] px-2.5 py-2 text-[10px] font-bold text-[#4f7359] hover:bg-[#cfe4cb]">Sugerir corrección</button></div></div>{isEditing && <p className="rounded-xl bg-[#eef6ec] px-3 py-2 text-[11px] leading-4 text-[#64816b]">Tu corrección se guardará como regla para futuras lecturas de {name}.</p>}</div>
        <div className="mt-5 flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl border border-[#dfe3db] px-4 py-3 text-[12px] font-semibold text-[#657268] hover:bg-[#f6f3ed]">Cancelar</button><button disabled={!name.trim()} onClick={() => { if (initialProduct && onCorrection) onCorrection(initialProduct, dateLabel, category, expiry); else onAdd({ id: Date.now(), name: name.trim(), category, expiry, days: 5, quantity: "1 unidad", status: "ok", icon: "📦", dateLabel }); onClose(); }} className="flex-1 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#16392c] disabled:cursor-not-allowed disabled:opacity-40">{isEditing ? "Guardar corrección" : "Guardar producto"}</button></div>
      </div>
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeNav, setActiveNav] = useState("Resumen");
  const [filter, setFilter] = useState<"all" | ProductStatus>("all");
  const [search, setSearch] = useState("");
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

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesFilter = filter === "all" || product.status === filter;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.category.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [filter, products, search]);

  const soonCount = products.filter((p) => p.status === "soon").length;
  const expiredCount = products.filter((p) => p.status === "expired").length;
  const okCount = products.filter((p) => p.status === "ok").length;
  const notificationGroups = groupNotifications(products.map(({ id, name, category, expiry, days, status }) => ({ id, name, category, expiry, days, status })), notificationPreferences);
  const expiringProducts = products.filter((product) => product.status === "soon" || product.status === "expired");

  useEffect(() => {
    const controller = new AbortController();
    setRecipesLoading(true);
    searchRecipesByIngredients(expiringProducts.map((product) => product.name), controller.signal).then(setRecipes).finally(() => setRecipesLoading(false));
    return () => controller.abort();
  }, [products]);

  const openRecipeDetail = async (recipe: RecipeSuggestion) => {
    setRecipeDetailLoading(true);
    try { setRecipeDetail(await getRecipeDetails(recipe)); } catch { setRecipeDetail(recipe); toast.error("No pudimos cargar el detalle", { description: "La receta sigue disponible con la información básica." }); }
    finally { setRecipeDetailLoading(false); }
  };

  const markRecipeUsed = (recipe: RecipeSuggestion) => {
    const usedIngredients = recipe.matchedIngredients;
    setProducts((current) => {
      const remaining = [...current];
      usedIngredients.forEach((ingredient) => {
        const targetIndex = remaining.findIndex((product) => product.name.toLowerCase().includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(product.name.toLowerCase()));
        if (targetIndex < 0) return;
        const target = remaining[targetIndex];
        const quantityMatch = target.quantity.match(/^(\d+)/);
        const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
        if (quantity > 1) remaining[targetIndex] = { ...target, quantity: target.quantity.replace(/^\d+/, String(quantity - 1)) };
        else remaining.splice(targetIndex, 1);
      });
      return remaining;
    });
    setImpact(recordImpact({ kg: 0.4, money: 1200, meals: 1 }));
    toast.success("¡Buen aprovechamiento!", { description: `${usedIngredients.join(", ")} se descontó de tu despensa.` });
  };

  const addProducts = (newProducts: Product[]) => {
    setProducts((current) => [...newProducts, ...current]);
    toast.success(`${newProducts.length} productos agregados`, { description: "Las fechas estimadas quedaron listas para revisar." });
  };

  const addProduct = (newProduct: Product) => {
    const learning = getLearningRule(newProduct.name, newProduct.category);
    setProducts((current) => [{ ...newProduct, dateLabel: learning?.preferredLabel || newProduct.dateLabel, days: learning?.shelfLifeDays || newProduct.days }, ...current]);
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

  const correctProduct = (product: Product, nextLabel: DateLabel, nextCategory: string, nextExpiry: string) => {
    saveLearningCorrection({ productKey: product.name, category: nextCategory, preferredLabel: nextLabel });
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, category: nextCategory, expiry: nextExpiry, dateLabel: nextLabel, corrected: true } : item));
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
    setProducts((current) => current.filter((product) => product.id !== selectedProduct.id));
    toast(`${selectedProduct.name} eliminado`, { icon: <Trash2 size={15} /> });
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#1c332b]">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] flex-col bg-[#17372b] px-4 py-5 text-[#e8f0e5] md:flex">
          <div className="flex items-center gap-2.5 px-2"><span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#d9e982] text-[#17372b]"><Leaf size={20} strokeWidth={2.4} /></span><div><p className="font-serif text-[21px] font-bold leading-none tracking-[-0.03em]">freshtrack</p><p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#a5c2a7]">menos desperdicio</p></div></div>
          <button onClick={() => setModal("scan")} className="mt-9 flex items-center justify-center gap-2 rounded-xl bg-[#d9e982] px-3 py-3 text-[12px] font-bold text-[#17372b] shadow-[0_8px_18px_rgba(217,233,130,0.12)] transition hover:bg-[#e5f39c] active:scale-[0.98]"><ScanLine size={16} /> Escanear compra</button>
          <p className="mb-2 mt-9 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#72927c]">Tu espacio</p>
          <nav className="space-y-1">{navItems.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => { setActiveNav(label); if (label === "Mi despensa") setPantryView("calendar"); else if (label !== "Resumen") toast(`${label}: vista en preparación`, { description: "Este módulo estará disponible en la próxima fase." }); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${activeNav === label ? "bg-[#315844] text-white" : "text-[#a4b9a8] hover:bg-[#254b39] hover:text-white"}`}><span className="flex items-center gap-3"><Icon size={16} strokeWidth={1.8} />{label}</span>{count && <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${activeNav === label ? "bg-[#496e55] text-[#eaf4e8]" : "bg-[#254b39] text-[#8eaa91]"}`}>{count}</span>}</button>)}</nav>
          <p className="mb-2 mt-8 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#72927c]">Cuenta</p>
          <nav className="space-y-1"><button onClick={() => setNotificationModal(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#a4b9a8] transition hover:bg-[#254b39] hover:text-white"><Bell size={16} strokeWidth={1.8} />Notificaciones<span className="ml-auto flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d9e982]" />{notificationGroups.length > 0 && <span className="text-[10px] text-[#d9e982]">{notificationGroups.length}</span>}</span></button><button onClick={() => toast("Próximamente", { description: "La configuración de tu espacio estará disponible pronto." })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#a4b9a8] transition hover:bg-[#254b39] hover:text-white"><Settings2 size={16} strokeWidth={1.8} />Configuración</button></nav>
          <div className="mt-auto rounded-2xl bg-[#204632] p-3.5"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e982] text-[12px] font-extrabold text-[#17372b]">SM</div><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-white">Sofía Martínez</p><p className="text-[10px] text-[#89a993]">Plan personal</p></div><ChevronRight size={14} className="ml-auto text-[#7da088]" /></div></div>
        </aside>

        <main className="min-w-0 flex-1 md:ml-[244px]">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#ebe8df]/80 bg-[#f7f5ef]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex items-center gap-3"><button className="rounded-xl p-2 text-[#52705e] hover:bg-[#ecebe3] md:hidden" onClick={() => setMobileNav(!mobileNav)}><Menu size={19} /></button><div className="md:hidden"><p className="font-serif text-[20px] font-bold tracking-[-0.04em] text-[#17372b]">freshtrack</p></div><div className="hidden items-center gap-2 text-[11px] text-[#88938a] md:flex"><CalendarDays size={14} />{formatToday()}</div></div>
            <div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-2 rounded-xl border border-[#e6e3db] bg-[#fffdf9] px-3 py-2 text-[#9ca59d] sm:flex"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en tu despensa" className="w-[150px] bg-transparent text-[11px] outline-none placeholder:text-[#aeb5ae]" /></div><button aria-label="Buscar" onClick={() => document.querySelector<HTMLInputElement>("input[placeholder='Buscar en tu despensa']")?.focus()} className="rounded-xl border border-[#e6e3db] bg-[#fffdf9] p-2.5 text-[#75867b] sm:hidden"><Search size={16} /></button><button aria-label="Ayuda" onClick={() => toast("¿Necesitás ayuda?", { description: "Escaneá un ticket y FreshTrack hace el resto." })} className="hidden rounded-xl p-2.5 text-[#75867b] transition hover:bg-[#ecebe3] sm:block"><CircleHelp size={17} /></button><button aria-label="Notificaciones" onClick={() => setNotificationModal(true)} className="relative rounded-xl p-2.5 text-[#75867b] transition hover:bg-[#ecebe3]"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#d79a2b]" /></button><div className="hidden h-8 w-8 items-center justify-center rounded-full bg-[#d9e982] text-[10px] font-extrabold text-[#17372b] sm:flex">SM</div></div>
          </header>

          {mobileNav && <div className="fixed inset-0 z-40 bg-[#142c23]/30 md:hidden" onClick={() => setMobileNav(false)}><div className="h-full w-[260px] bg-[#17372b] p-5 text-white" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-2"><Leaf size={19} className="text-[#d9e982]" /><p className="font-serif text-xl">freshtrack</p></div><button onClick={() => { setModal("scan"); setMobileNav(false); }} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d9e982] px-3 py-3 text-[12px] font-bold text-[#17372b]"><ScanLine size={16} /> Escanear compra</button><div className="mt-6 space-y-1">{navItems.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => { setActiveNav(label); if (label === "Mi despensa") setPantryView("calendar"); setMobileNav(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[12px] font-semibold text-[#afc4b2]"><span className="flex items-center gap-3"><Icon size={16} />{label}</span>{count && <span>{count}</span>}</button>)}</div></div></div>}

          <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
            <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative overflow-hidden rounded-[26px] bg-[#dfead7] px-6 py-7 sm:px-8 sm:py-9"><div className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[28px] border-[#cadfbd]/60" /><div className="absolute -bottom-20 right-16 h-40 w-40 rounded-full border-[20px] border-[#e9f1df]/65" /><div className="relative max-w-[470px]"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#588064]"><span className="h-2 w-2 rounded-full bg-[#7eaf83]" /> Tu despensa, en calma</div><h1 className="mt-4 max-w-[450px] font-serif text-[36px] font-semibold leading-[0.98] tracking-[-0.045em] text-[#17372b] sm:text-[47px]">Que nada rico<br /><span className="italic text-[#4c815c]">termine en la basura.</span></h1><p className="mt-4 max-w-[380px] text-[13px] leading-6 text-[#5d7866]">FreshTrack lee tus tickets, estima vencimientos y te avisa justo a tiempo. Menos carga manual, más comida aprovechada.</p><div className="mt-6 flex flex-wrap items-center gap-2.5"><button onClick={() => setModal("scan")} className="inline-flex items-center gap-2 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white shadow-[0_10px_20px_rgba(31,73,58,0.18)] transition hover:bg-[#16392c] active:scale-[0.97]"><ScanLine size={16} /> Escanear compra</button><button onClick={() => setModal("add")} className="inline-flex items-center gap-2 rounded-xl border border-[#b9d0bb] bg-[#eef5e8]/60 px-4 py-3 text-[12px] font-bold text-[#2c6448] transition hover:bg-white"><Plus size={15} /> Agregar manual</button></div><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-[#5f8167]"><span className="rounded-full bg-[#eff6e9] px-2 py-1">{getCatalogSize()} productos regionales</span><span>·</span><span>vida útil abierto / cerrado</span></div><div className="mt-5 flex items-center gap-3 text-[11px] text-[#6f8978]"><div className="flex -space-x-2"><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#dfead7] bg-[#e7b98c] text-[9px]">LM</span><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#dfead7] bg-[#a9c4a1] text-[9px]">JP</span><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#dfead7] bg-[#e7d690] text-[9px]">+2</span></div><span>Ya lo usan familias que quieren desperdiciar menos.</span></div></div></div>
              <div className="group relative min-h-[300px] overflow-hidden rounded-[26px] bg-[#e9e1cf] shadow-[0_14px_35px_rgba(74,79,55,0.09)]"><div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.03]" style={{ backgroundImage: "url('/manus-storage/freshtrack-groceries_7fc4d68c.png')" }} /><div className="absolute inset-0 bg-gradient-to-t from-[#18352a]/80 via-[#18352a]/10 to-transparent" /><div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-[#fffdf9]/85 px-3 py-1.5 text-[10px] font-bold text-[#315542] backdrop-blur-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#6cac78]" /> Último escaneo · hace 2 h</div><div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white"><div><p className="text-[11px] font-medium text-[#d8ead8]">Supermercado Día</p><p className="mt-1 font-serif text-[25px] font-semibold tracking-[-0.03em]">12 productos detectados</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9e982] text-[#17372b]"><ArrowUpRight size={18} /></div></div></div>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="En tu despensa" value={`${products.length + 17}`} note="productos registrados" icon={<PackageOpen size={17} />} tone="bg-[#e6f0e6] text-[#4d835e]" /><StatCard label="Por vencer" value={`${soonCount + 7}`} note="en los próximos 7 días" icon={<Clock3 size={17} />} tone="bg-[#fbf0d2] text-[#b67d27]" trend="up" /><StatCard label="Ya vencidos" value={`${expiredCount}`} note="requieren atención" icon={<Zap size={17} />} tone="bg-[#f8e4dd] text-[#bf644f]" /><StatCard label="Desperdicio evitado" value={formatMoney(impact.moneySaved)} note={`${impact.kgSaved} kg este mes`} icon={<ArrowDownRight size={17} />} tone="bg-[#e5eee8] text-[#4d835e]" trend="down" /></section>

            <section className="mt-5 rounded-[24px] border border-[#dfe9dc] bg-[#edf6e9] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5b8964]"><ArrowDownRight size={14} /> Impacto de este mes</p><h2 className="mt-2 font-serif text-[26px] font-semibold tracking-[-0.04em] text-[#1b392e]">Pequeños gestos, menos desperdicio.</h2><p className="mt-1 max-w-[500px] text-[11px] leading-5 text-[#708674]">Cada vez que aprovechás algo a tiempo, FreshTrack lo suma. Sin rankings ni presión: solo una señal amable de lo que estás logrando.</p></div><div className="rounded-2xl bg-white/75 px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#86a18a]">Acciones</p><p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#315542]">{impact.actions}</p><p className="text-[10px] text-[#829585]">este mes</p></div></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-semibold text-[#829585]">Comida salvada</p><p className="mt-1 text-xl font-semibold text-[#315542]">{impact.kgSaved} kg</p></div><div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-semibold text-[#829585]">Valor recuperado</p><p className="mt-1 text-xl font-semibold text-[#315542]">{formatMoney(impact.moneySaved)}</p></div><div className="rounded-2xl bg-white/70 p-3"><p className="text-[10px] font-semibold text-[#829585]">Comidas posibles</p><p className="mt-1 text-xl font-semibold text-[#315542]">{impact.mealsSaved}</p></div></div></section>

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
              <div className="rounded-[24px] border border-[#ebe8df] bg-[#fffdf9] px-4 py-4 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="font-serif text-[23px] font-semibold tracking-[-0.035em] text-[#1b392e]">{pantryView === "calendar" ? "Próxima semana" : "Por vencer esta semana"}</h2><span className="rounded-full bg-[#fbf0d2] px-2 py-0.5 text-[10px] font-bold text-[#a67425]">{soonCount + 7} pendientes</span></div><p className="mt-1 text-[11px] text-[#929b93]">{pantryView === "calendar" ? "Planificá tus comidas viendo qué vence cada día." : "Una mirada rápida para decidir qué consumir primero."}</p></div><div className="flex items-center gap-1 rounded-xl bg-[#f4f1e9] p-1"><button onClick={() => setPantryView("list")} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${pantryView === "list" ? "bg-white text-[#3c7350] shadow-sm" : "text-[#9aa29a]"}`}>Lista</button><button onClick={() => setPantryView("calendar")} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${pantryView === "calendar" ? "bg-white text-[#3c7350] shadow-sm" : "text-[#9aa29a]"}`}><CalendarDays size={12} /> Próxima semana</button></div></div>{pantryView === "calendar" ? <WeekCalendar products={products} /> : <><div className="mt-4 flex items-center gap-2 overflow-x-auto border-b border-[#eeeae1] pb-3"><button onClick={() => setFilter("all")} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${filter === "all" ? "bg-[#edf4e9] text-[#3c7350]" : "text-[#9aa29a] hover:bg-[#f6f4ed]"}`}>Todos ({products.length})</button><button onClick={() => setFilter("soon")} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${filter === "soon" ? "bg-[#fbf0d2] text-[#a67425]" : "text-[#9aa29a] hover:bg-[#f6f4ed]"}`}>Por vencer ({soonCount})</button><button onClick={() => setFilter("expired")} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${filter === "expired" ? "bg-[#f9e5df] text-[#a94c3c]" : "text-[#9aa29a] hover:bg-[#f6f4ed]"}`}>Vencidos ({expiredCount})</button></div><div className="mt-1">{filteredProducts.slice(0, 5).map((product) => <ProductRow key={product.id} product={product} onRemove={() => setSelectedProduct(product)} onEdit={setSelectedProduct} />)}{filteredProducts.length === 0 && <div className="py-10 text-center"><PackageOpen className="mx-auto text-[#b7c2b7]" size={28} /><p className="mt-2 text-sm font-semibold text-[#607369]">No encontramos productos</p><p className="mt-1 text-[11px] text-[#9aa29a]">Probá cambiar el filtro o tu búsqueda.</p></div>}</div></>}</div>

              <div className="rounded-[24px] border border-[#ebe8df] bg-[#fffdf9] p-5 shadow-[0_8px_24px_rgba(55,63,48,0.035)]"><div className="flex items-start justify-between"><div><h2 className="font-serif text-[23px] font-semibold tracking-[-0.035em] text-[#1b392e]">Estado general</h2><p className="mt-1 text-[11px] text-[#929b93]">Tu despensa está bastante bien.</p></div><button onClick={() => toast("Reporte mensual", { description: "La vista detallada de reportes está en preparación." })} className="rounded-lg p-1.5 text-[#a0aaa0] hover:bg-[#f5f3ec]"><MoreHorizontal size={17} /></button></div><div className="mt-5 flex items-center gap-5"><div className="relative flex h-[136px] w-[136px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#5d9b72 0 74%, #e3aa36 74% 92%, #d66f5b 92% 100%)` }}><div className="flex h-[94px] w-[94px] flex-col items-center justify-center rounded-full bg-[#fffdf9]"><p className="text-[28px] font-semibold tracking-[-0.06em] text-[#1f493a]">92%</p><p className="text-[10px] text-[#8c968e]">en fecha</p></div></div><div className="space-y-3">{[["En fecha", okCount + 15, "#5d9b72"], ["Por vencer", soonCount + 7, "#e3aa36"], ["Vencidos", expiredCount, "#d66f5b"]].map(([label, count, color]) => <div key={label as string} className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color as string }} /><div><p className="text-[11px] font-semibold text-[#506258]">{label}</p><p className="text-[10px] text-[#9ca49d]">{count} productos</p></div></div>)}</div></div><div className="mt-6 rounded-2xl bg-[#f3f7ee] p-3.5"><div className="flex items-center gap-2 text-[#4a7d58]"><Sparkles size={15} /><p className="text-[11px] font-bold">Tip de FreshTrack</p></div><p className="mt-1.5 text-[11px] leading-5 text-[#728776]">Consumí primero lo que está en amarillo. Así evitás que llegue al rojo.</p></div></div>
            </section>

            <section className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr]">
              <div className="rounded-[24px] bg-[#17372b] p-5 text-white sm:p-6"><div className="flex items-start justify-between"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ebea0]"><Route size={13} /> Recorrida sugerida</p><h2 className="mt-2 font-serif text-[25px] font-semibold tracking-[-0.035em]">Tres cosas para resolver hoy.</h2></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315844] text-[#d9e982]"><MapPin size={18} /></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3">{[["1", "Leche entera", "Heladera"], ["2", "Tomates cherry", "Cajón verduras"], ["3", "Yogur natural", "Heladera"]].map(([number, name, place]) => <button key={name} onClick={() => toast(name, { description: `Ubicación: ${place}` })} className="group rounded-xl bg-[#204632] p-3 text-left transition hover:bg-[#2a5740]"><div className="flex items-center justify-between"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#d9e982] text-[10px] font-extrabold text-[#17372b]">{number}</span><ArrowUpRight size={14} className="text-[#75977d] transition group-hover:text-[#d9e982]" /></div><p className="mt-4 truncate text-[11px] font-semibold text-white">{name}</p><p className="mt-1 truncate text-[10px] text-[#8fb096]">{place}</p></button>)}</div><button onClick={() => setActiveNav("Recorrida")} className="mt-5 flex items-center gap-1 text-[11px] font-bold text-[#d9e982] hover:text-white">Ver recorrido completo <ChevronRight size={14} /></button></div>
              <div className="rounded-[24px] border border-[#ebe8df] bg-[#f1eadc] p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a28153]"><Utensils size={13} /> Ideas para aprovechar</p><h2 className="mt-2 max-w-[300px] font-serif text-[25px] font-semibold leading-[1.05] tracking-[-0.035em] text-[#503c26]">Recetas con lo que vence primero.</h2></div><div className="text-4xl">🥬</div></div><p className="mt-3 text-[11px] leading-5 text-[#806c53]">{recipesLoading ? "Buscando opciones que aprovechen tu despensa…" : `Encontramos ${recipes.length || 3} ideas para usar antes de que se pierdan.`}</p><div className="mt-4 grid gap-2">{recipes.slice(0, 3).map((recipe) => <div key={recipe.id} role="button" tabIndex={0} aria-label={`Ver detalle de ${recipe.title}`} onClick={() => openRecipeDetail(recipe)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openRecipeDetail(recipe); }} className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white/60 p-2 transition hover:bg-white"><img src={recipe.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-[#5a452c]">{recipe.title}</p><p className="mt-0.5 truncate text-[10px] text-[#967e61]">Usa: {recipe.matchedIngredients.join(", ")}</p><p className="mt-0.5 text-[9px] font-semibold text-[#a28153]">Ver ingredientes y pasos</p></div><button onClick={(event) => { event.stopPropagation(); markRecipeUsed(recipe); }} className="shrink-0 rounded-lg bg-[#ead7b8] px-2 py-1.5 text-[9px] font-bold text-[#765a35] transition hover:bg-[#dfc79f]">Aproveché</button></div>)}</div><p className="mt-3 text-[9px] text-[#aa967b]">Fuente: TheMealDB · sugerencias orientativas</p></div>
            </section>

            <footer className="flex flex-col gap-2 pb-2 pt-8 text-[10px] text-[#a0a79f] sm:flex-row sm:items-center sm:justify-between"><p>FreshTrack · Menos desperdicio, más tranquilidad.</p><p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#75a879]" /> Datos guardados localmente · Última sincronización hace 2 min</p></footer>
          </div>
        </main>
      </div>

      {modal === "scan" && <ScanModal onClose={() => setModal(null)} onComplete={addProducts} />}
      {modal === "add" && <AddProductModal onClose={() => { setModal(null); setEditingProduct(null); }} onAdd={addProduct} initialProduct={editingProduct || undefined} onCorrection={correctProduct} onSuggest={suggestShelfLife} />}
      {recipeDetail && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/40 p-3 backdrop-blur-sm sm:items-center"><div className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[28px] bg-[#fffdf9] shadow-[0_30px_80px_rgba(13,33,25,0.26)]"><div className="relative h-40 overflow-hidden rounded-t-[28px] bg-[#e8dfcf]"><img src={recipeDetail.image} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#17372b]/75 to-transparent" /><button aria-label="Cerrar receta" onClick={() => setRecipeDetail(null)} className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[#315542] backdrop-blur-sm"><X size={17} /></button><div className="absolute bottom-4 left-5 right-5"><p className="font-serif text-2xl font-semibold text-white">{recipeDetail.title}</p><p className="mt-1 text-[10px] text-[#dcebdd]">{recipeDetail.area || "Receta sugerida"}{recipeDetail.category ? ` · ${recipeDetail.category}` : ""}</p></div></div>{recipeDetailLoading ? <div className="p-6 text-center text-sm text-[#718273]">Cargando ingredientes y pasos…</div> : <div className="p-5 sm:p-6"><div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr]"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#719078]">Ingredientes</p><div className="mt-3 space-y-2">{(recipeDetail.ingredients || recipeDetail.matchedIngredients.map((name) => ({ name, measure: "a gusto" }))).map((ingredient) => <div key={`${ingredient.name}-${ingredient.measure}`} className="flex items-start justify-between gap-3 border-b border-[#f0ede6] pb-2 text-[11px]"><span className="font-semibold text-[#425b4b]">{ingredient.name}</span><span className="text-right text-[#9a8b75]">{ingredient.measure}</span></div>)}</div></div><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#719078]">Paso a paso</p><div className="mt-3 space-y-3">{(recipeDetail.instructions || "Prepará los ingredientes, cociná hasta que estén tiernos y serví caliente.").split(/\r?\n+/).filter(Boolean).map((step, index) => <div key={`${index}-${step.slice(0, 8)}`} className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e6f0e6] text-[10px] font-bold text-[#4d835e]">{index + 1}</span><p className="text-[11px] leading-5 text-[#6e7d70]">{step}</p></div>)}</div></div></div><button onClick={() => { markRecipeUsed(recipeDetail); setRecipeDetail(null); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#16392c]"><Check size={15} /> Aproveché esta receta</button></div>}</div></div>}
      {notificationModal && <NotificationSettingsModal onClose={() => setNotificationModal(false)} products={products} preferences={notificationPreferences} onSave={savePreferences} />}
      {selectedProduct && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142c23]/30 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-[370px] rounded-[26px] bg-[#fffdf9] p-5 shadow-[0_30px_80px_rgba(13,33,25,0.2)]"><div className="flex items-start gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f1e7] text-2xl">{selectedProduct.icon}</span><div className="min-w-0 flex-1"><p className="font-serif text-xl font-semibold text-[#17372b]">{selectedProduct.name}</p><p className="mt-1 text-[11px] text-[#90998f]">{selectedProduct.category} · {selectedProduct.quantity}</p></div><button onClick={() => setSelectedProduct(null)} className="text-[#9ba49c] hover:text-[#17372b]"><X size={17} /></button></div><div className="mt-5 rounded-2xl bg-[#f7f4ed] p-3.5"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-[#7f8980]">{labelForDisplay(selectedProduct.dateLabel || "desconocida")}</span><MiniStatus status={selectedProduct.status} /></div><p className="mt-2 text-lg font-semibold text-[#294338]">{selectedProduct.expiry}</p><p className="mt-1 text-[11px] text-[#8d978f]">{selectedProduct.days < 0 ? "Este producto ya venció" : `Faltan ${selectedProduct.days} días`}</p>{selectedProduct.corrected && <p className="mt-2 text-[10px] font-semibold text-[#4e815b]">✓ Corrección aplicada a futuras detecciones</p>}</div><div className="mt-4 flex gap-2"><button onClick={() => { setEditingProduct(selectedProduct); setSelectedProduct(null); setModal("add"); }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe3db] px-3 py-2.5 text-[11px] font-bold text-[#657268] hover:bg-[#f6f3ed]"><Pencil size={14} /> Corregir</button><button onClick={removeSelected} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f9e5df] px-3 py-2.5 text-[11px] font-bold text-[#a94c3c] hover:bg-[#f4d8d0]"><Trash2 size={14} /> Eliminar</button></div></div></div>}
    </div>
  );
}

function TrendingDownIcon() {
  return <ArrowDownRight size={17} />;
}
