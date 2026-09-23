import { useMemo, useState } from "react";
import {
  Check,
  PackageCheck,
  PackageOpen,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConsumptionHistoryEntry,
  generateSmartSuggestions,
  migratePurchasedItemsToPantry,
  ShoppingItem,
  ShoppingItemReason,
} from "@/lib/shoppingList";
import { ALL_CATEGORIES } from "@/lib/categories";
import { Product, StoredProduct } from "@/types/product";

interface ShoppingListModuleProps {
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  pantryProducts: Product[];
  consumptionHistory: ConsumptionHistoryEntry[];
  onAddProductsToPantry: (products: StoredProduct[]) => void;
  detectIconFn: (name: string, category: string) => string;
}

const reasonBadges: Record<ShoppingItemReason, { label: string; bg: string; text: string }> = {
  frecuente: { label: "Frecuente", bg: "bg-status-ok-bg", text: "text-status-ok-text" },
  stock_bajo: { label: "Stock bajo", bg: "bg-status-soon-bg", text: "text-status-soon-text" },
  vencido: { label: "Reponer", bg: "bg-status-expired-bg", text: "text-status-expired-text" },
  manual: { label: "Manual", bg: "bg-surface-elevated", text: "text-content-muted" },
};

export function ShoppingListModule({
  shoppingList,
  setShoppingList,
  pantryProducts,
  consumptionHistory,
  onAddProductsToPantry,
  detectIconFn,
}: ShoppingListModuleProps) {
  // Input fields for manual adding
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1 unidad");
  const [itemCategory, setItemCategory] = useState("Almacén seco");
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "completed">("all");

  // Generate automated suggestions
  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(pantryProducts, consumptionHistory, shoppingList);
  }, [pantryProducts, consumptionHistory, shoppingList]);

  const pendingCount = shoppingList.filter((item) => !item.completed).length;
  const completedCount = shoppingList.filter((item) => item.completed).length;

  // Filtered view
  const displayedItems = useMemo(() => {
    if (filterMode === "pending") return shoppingList.filter((item) => !item.completed);
    if (filterMode === "completed") return shoppingList.filter((item) => item.completed);
    return shoppingList;
  }, [shoppingList, filterMode]);

  // Handlers
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    const newItem: ShoppingItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: itemName.trim(),
      quantity: itemQuantity.trim() || "1 unidad",
      category: itemCategory,
      reason: "manual",
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setShoppingList((prev) => [newItem, ...prev]);
    toast.success(`"${newItem.name}" agregado a la lista de compras.`);
    setItemName("");
    setItemQuantity("1 unidad");
  };

  const handleToggleItem = (id: string) => {
    setShoppingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddSuggestion = (sug: ShoppingItem) => {
    setShoppingList((prev) => [sug, ...prev]);
    toast.success(`"${sug.name}" agregado a tu lista.`);
  };

  const handleAddAllSuggestions = () => {
    if (smartSuggestions.length === 0) return;
    setShoppingList((prev) => [...smartSuggestions, ...prev]);
    toast.success(`${smartSuggestions.length} sugerencias agregadas a la lista.`);
  };

  const handleClearCompleted = () => {
    setShoppingList((prev) => prev.filter((item) => !item.completed));
    toast("Productos comprados eliminados de la lista.");
  };

  const handleMigrateCompletedToPantry = () => {
    const { createdProducts, remainingShoppingList } = migratePurchasedItemsToPantry(
      shoppingList,
      detectIconFn
    );
    if (createdProducts.length === 0) return;

    onAddProductsToPantry(createdProducts);
    setShoppingList(remainingShoppingList);
    toast.success(
      `¡${createdProducts.length} ${createdProducts.length === 1 ? "producto migrado" : "productos migrados"} a tu despensa!`,
      {
        description: "Se estimaron sus fechas de vencimiento automáticamente.",
      }
    );
  };

  return (
    <section id="module-shopping" className="scroll-mt-24 mt-8 rounded-[28px] border border-line bg-surface p-6 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand">
            <ShoppingCart size={15} /> Lista inteligente de reposición
          </div>
          <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.035em] text-content">
            Lista de compras y reposición
          </h2>
          <p className="mt-0.5 text-xs text-content-muted">
            Generada automáticamente según los alimentos que consumís con más frecuencia y el stock bajo de tu despensa.
          </p>
        </div>

        {completedCount > 0 && (
          <button
            onClick={handleMigrateCompletedToPantry}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover active:scale-[0.98]"
          >
            <PackageCheck size={16} /> Mover comprados a despensa ({completedCount})
          </button>
        )}
      </div>

      {/* Smart Restock Suggestions Banner */}
      {smartSuggestions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-brand-border bg-brand-subtle p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-brand">
              <Sparkles size={16} className="text-status-soon-dot" />
              Sugerencias automáticas por consumo y stock ({smartSuggestions.length})
            </div>
            <button
              onClick={handleAddAllSuggestions}
              className="min-h-[44px] flex items-center text-xs font-bold text-brand underline hover:text-brand-hover"
            >
              Agregar todas
            </button>
          </div>
          <p className="mt-1 text-xs text-content-body">
            Detectamos productos consumidos en tus recetas que hoy están agotados o por vencerse:
          </p>

          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
            {smartSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="flex min-w-[200px] shrink-0 items-center justify-between rounded-xl border border-brand-border bg-surface p-2.5 shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-bold text-content">{sug.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        reasonBadges[sug.reason].bg
                      } ${reasonBadges[sug.reason].text}`}
                    >
                      {reasonBadges[sug.reason].label}
                    </span>
                    <span className="truncate text-xs text-content-muted">{sug.notes}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddSuggestion(sug)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-status-ok-bg text-brand transition hover:bg-brand hover:text-white"
                  aria-label={`Agregar ${sug.name} a la lista`}
                  title="Agregar a la lista"
                >
                  <Plus size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Form */}
      <form
        onSubmit={handleAddItem}
        className="mt-6 grid gap-2.5 rounded-2xl border border-line bg-surface-subtle p-3.5 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
      >
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          aria-label="Nombre del producto"
          placeholder="¿Qué necesitás comprar? (ej. Leche entera, Huevos)"
          className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs text-content outline-none focus:border-brand"
        />
        <input
          value={itemQuantity}
          onChange={(e) => setItemQuantity(e.target.value)}
          aria-label="Cantidad"
          placeholder="Cantidad (ej. 2 litros, 500g)"
          className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs text-content outline-none focus:border-brand"
        />
        <select
          value={itemCategory}
          onChange={(e) => setItemCategory(e.target.value)}
          aria-label="Categoría del producto"
          className="rounded-xl border border-line-strong bg-surface px-2.5 py-2 text-xs text-content outline-none"
        >
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-hover"
        >
          <Plus size={15} /> Agregar
        </button>
      </form>

      {/* Filter Tabs & Clean Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode("all")}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filterMode === "all" ? "bg-brand-subtle text-brand" : "text-content-muted hover:bg-surface-elevated"
            }`}
          >
            Todos ({shoppingList.length})
          </button>
          <button
            onClick={() => setFilterMode("pending")}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filterMode === "pending" ? "bg-brand-subtle text-brand" : "text-content-muted hover:bg-surface-elevated"
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterMode("completed")}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filterMode === "completed" ? "bg-brand-subtle text-brand" : "text-content-muted hover:bg-surface-elevated"
            }`}
          >
            Comprados ({completedCount})
          </button>
        </div>

        {completedCount > 0 && (
          <button
            onClick={handleClearCompleted}
            className="min-h-[44px] flex items-center text-xs font-semibold text-status-expired-text transition hover:underline"
          >
            Limpiar comprados
          </button>
        )}
      </div>

      {/* Shopping List Items */}
      <div className="mt-3 divide-y divide-line">
        {displayedItems.length > 0 ? (
          displayedItems.map((item) => {
            const badge = reasonBadges[item.reason] || reasonBadges.manual;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 py-3 transition ${
                  item.completed ? "opacity-60" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    aria-label={item.completed ? `Marcar ${item.name} como pendiente` : `Marcar ${item.name} como comprado`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-elevated"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                        item.completed
                          ? "border-brand bg-brand text-white"
                          : "border-line-strong hover:border-brand"
                      }`}
                    >
                      {item.completed && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-semibold ${
                        item.completed ? "line-through text-content-muted" : "text-content"
                      }`}
                    >
                      {item.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                      <span>{item.quantity}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-content-muted hover:bg-status-expired-bg hover:text-status-expired-text"
                    aria-label={`Eliminar ${item.name} de la lista`}
                    title="Eliminar de la lista"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <PackageOpen className="mx-auto text-line-strong" size={32} />
            <p className="mt-2 text-sm font-semibold text-content-body">
              {filterMode === "completed" ? "No hay productos comprados aún" : "Tu lista de compras está vacía"}
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Agregá productos manualmente o elegí de las sugerencias inteligentes de reposición.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
