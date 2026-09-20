import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  PackageCheck,
  PackageOpen,
  Plus,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConsumptionHistoryEntry,
  generateSmartSuggestions,
  migratePurchasedItemsToPantry,
  PantryItemReference,
  ShoppingItem,
  ShoppingItemReason,
} from "@/lib/shoppingList";

interface ShoppingListModuleProps {
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  pantryProducts: PantryItemReference[];
  consumptionHistory: ConsumptionHistoryEntry[];
  onAddProductsToPantry: (products: any[]) => void;
  detectIconFn: (name: string, category: string) => string;
}

const CATEGORIES = [
  "Almacén seco",
  "Lácteos",
  "Fiambres y embutidos",
  "Carnes",
  "Pescados y mariscos",
  "Verduras frescas",
  "Frutas frescas",
  "Panadería",
  "Enlatados y conservas",
  "Congelados",
  "Salsas y aderezos",
  "Snacks y galletitas",
  "Bebidas",
  "Café, té y desayuno",
  "Refrigerados preparados",
];

const reasonBadges: Record<ShoppingItemReason, { label: string; bg: string; text: string }> = {
  frecuente: { label: "Frecuente", bg: "bg-[#e5f1e8]", text: "text-[#2e6443]" },
  stock_bajo: { label: "Stock bajo", bg: "bg-[#fef3d8]", text: "text-[#9e6f1f]" },
  vencido: { label: "Reponer", bg: "bg-[#fce8e6]", text: "text-[#aa4b3c]" },
  manual: { label: "Manual", bg: "bg-[#f0ece3]", text: "text-[#6c766e]" },
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
      id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: itemName.trim(),
      category: itemCategory,
      quantity: itemQuantity.trim() || "1 unidad",
      reason: "manual",
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setShoppingList((curr) => [newItem, ...curr]);
    setItemName("");
    setItemQuantity("1 unidad");
    toast.success("Producto agregado a la lista de compras");
  };

  const handleToggleItem = (id: string) => {
    setShoppingList((curr) =>
      curr.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setShoppingList((curr) => curr.filter((item) => item.id !== id));
  };

  const handleAddSuggestion = (suggestion: ShoppingItem) => {
    setShoppingList((curr) => [suggestion, ...curr]);
    toast.success(`"${suggestion.name}" agregado para reposición`);
  };

  const handleAddAllSuggestions = () => {
    if (smartSuggestions.length === 0) return;
    setShoppingList((curr) => [...smartSuggestions, ...curr]);
    toast.success(`Se agregaron ${smartSuggestions.length} sugerencias a tu lista`);
  };

  const handleMigrateCompletedToPantry = () => {
    if (completedCount === 0) return;

    const { createdProducts, remainingShoppingList } = migratePurchasedItemsToPantry(
      shoppingList,
      detectIconFn
    );

    onAddProductsToPantry(createdProducts);
    setShoppingList(remainingShoppingList);

    toast.success("¡Compras ingresadas a la despensa!", {
      description: `Se sumaron ${createdProducts.length} producto${
        createdProducts.length === 1 ? "" : "s"
      } con vida útil estimada.`,
    });
  };

  const handleClearCompleted = () => {
    setShoppingList((curr) => curr.filter((item) => !item.completed));
    toast("Comprados eliminados de la lista");
  };

  return (
    <section id="module-shopping" className="scroll-mt-24 mt-8 rounded-[28px] border border-[#ebe7de] bg-[#fffdf9] p-6 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#4e815e]">
            <ShoppingCart size={15} /> Lista inteligente de reposición
          </div>
          <h2 className="mt-1 font-serif text-[26px] font-semibold tracking-[-0.035em] text-[#1a382d]">
            Lista de compras y reposición
          </h2>
          <p className="mt-0.5 text-[12px] text-[#869288]">
            Generada automáticamente según los alimentos que consumís con más frecuencia y el stock bajo de tu despensa.
          </p>
        </div>

        {completedCount > 0 && (
          <button
            onClick={handleMigrateCompletedToPantry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f493a] px-4 py-3 text-[12px] font-bold text-white shadow-[0_6px_18px_rgba(31,73,58,0.18)] transition hover:bg-[#16392c] active:scale-[0.98]"
          >
            <PackageCheck size={16} /> Mover comprados a despensa ({completedCount})
          </button>
        )}
      </div>

      {/* Smart Restock Suggestions Banner */}
      {smartSuggestions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#cfe2d2] bg-[#edf6ee] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[#235338]">
              <Sparkles size={16} className="text-[#d69f36]" />
              Sugerencias automáticas por consumo y stock ({smartSuggestions.length})
            </div>
            <button
              onClick={handleAddAllSuggestions}
              className="text-[11px] font-bold text-[#2b6544] underline hover:text-[#183c27]"
            >
              Agregar todas
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#63846d]">
            Detectamos productos consumidos en tus recetas que hoy están agotados o por vencerse:
          </p>

          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
            {smartSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="flex min-w-[200px] shrink-0 items-center justify-between rounded-xl border border-[#d2e5d5] bg-white p-2.5 shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-[12px] font-bold text-[#213f30]">{sug.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                        reasonBadges[sug.reason].bg
                      } ${reasonBadges[sug.reason].text}`}
                    >
                      {reasonBadges[sug.reason].label}
                    </span>
                    <span className="truncate text-[10px] text-[#8e988f]">{sug.notes}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddSuggestion(sug)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e7f1e9] text-[#2c5f40] transition hover:bg-[#1f493a] hover:text-white"
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
        className="mt-6 grid gap-2.5 rounded-2xl border border-[#ede9e0] bg-[#fbf9f4] p-3.5 sm:grid-cols-[1.5fr_1fr_1fr_auto]"
      >
        <input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="¿Qué necesitás comprar? (ej. Leche entera, Huevos)"
          className="rounded-xl border border-[#e5dfd2] bg-white px-3 py-2 text-[12px] text-[#263e32] outline-none focus:border-[#4d8660]"
        />
        <input
          value={itemQuantity}
          onChange={(e) => setItemQuantity(e.target.value)}
          placeholder="Cantidad (ej. 2 litros, 500g)"
          className="rounded-xl border border-[#e5dfd2] bg-white px-3 py-2 text-[12px] text-[#263e32] outline-none focus:border-[#4d8660]"
        />
        <select
          value={itemCategory}
          onChange={(e) => setItemCategory(e.target.value)}
          className="rounded-xl border border-[#e5dfd2] bg-white px-2.5 py-2 text-[12px] text-[#263e32] outline-none"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1f493a] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#16392c]"
        >
          <Plus size={15} /> Agregar
        </button>
      </form>

      {/* Filter Tabs & Clean Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeae1] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode("all")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              filterMode === "all" ? "bg-[#e8f1e7] text-[#2e6241]" : "text-[#879288] hover:bg-[#f6f2ea]"
            }`}
          >
            Todos ({shoppingList.length})
          </button>
          <button
            onClick={() => setFilterMode("pending")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              filterMode === "pending" ? "bg-[#e8f1e7] text-[#2e6241]" : "text-[#879288] hover:bg-[#f6f2ea]"
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterMode("completed")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              filterMode === "completed" ? "bg-[#e8f1e7] text-[#2e6241]" : "text-[#879288] hover:bg-[#f6f2ea]"
            }`}
          >
            Comprados ({completedCount})
          </button>
        </div>

        {completedCount > 0 && (
          <button
            onClick={handleClearCompleted}
            className="text-[11px] font-semibold text-[#a55243] transition hover:underline"
          >
            Limpiar comprados
          </button>
        )}
      </div>

      {/* Shopping List Items */}
      <div className="mt-3 divide-y divide-[#eee9df]">
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
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      item.completed
                        ? "border-[#4c845d] bg-[#4c845d] text-white"
                        : "border-[#c5cdc5] hover:border-[#4c845d]"
                    }`}
                  >
                    {item.completed && <Check size={13} strokeWidth={3} />}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-[13px] font-semibold ${
                        item.completed ? "line-through text-[#8b958c]" : "text-[#233b30]"
                      }`}
                    >
                      {item.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#8e988f]">
                      <span>{item.quantity}</span>
                      <span>·</span>
                      <span>{item.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="rounded-lg p-1.5 text-[#a8b0a8] hover:bg-[#fceeed] hover:text-[#c45341]"
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
            <PackageOpen className="mx-auto text-[#c1cac1]" size={32} />
            <p className="mt-2 text-sm font-semibold text-[#5e7166]">
              {filterMode === "completed" ? "No hay productos comprados aún" : "Tu lista de compras está vacía"}
            </p>
            <p className="mt-1 text-[11px] text-[#919c92]">
              Agregá productos manualmente o elegí de las sugerencias inteligentes de reposición.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
