import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConsumptionHistoryEntry,
  generateSmartSuggestions,
  migratePurchasedItemsToPantry,
  ShoppingItem,
  addOrMergeShoppingItem,
  addLowStockToShoppingList,
  getItemReasonBadges,
  groupShoppingItemsByCategory,
  updateShoppingItemQuantity,
  adjustShoppingItemQuantityStep,
} from "@/lib/shoppingList";
import { ALL_CATEGORIES } from "@/lib/categories";
import { Product, StoredProduct } from "@/types/product";
import { isQuantityLow, parseQuantity, formatQuantity } from "@/lib/quantity";

interface ShoppingListModuleProps {
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  pantryProducts: Product[];
  consumptionHistory: ConsumptionHistoryEntry[];
  onAddProductsToPantry: (products: StoredProduct[]) => void;
  detectIconFn: (name: string, category: string) => string;
}

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

  // Inline quantity editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantityInput, setEditingQuantityInput] = useState<string>("");

  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Generate automated suggestions
  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(pantryProducts, consumptionHistory, shoppingList);
  }, [pantryProducts, consumptionHistory, shoppingList]);

  // Low stock pantry items
  const lowStockPantryItems = useMemo(() => {
    return pantryProducts.filter((p) => p.status !== "expired" && isQuantityLow(p.quantity));
  }, [pantryProducts]);

  const pendingCount = shoppingList.filter((item) => !item.completed).length;
  const completedCount = shoppingList.filter((item) => item.completed).length;

  // Filtered view
  const displayedItems = useMemo(() => {
    if (filterMode === "pending") return shoppingList.filter((item) => !item.completed);
    if (filterMode === "completed") return shoppingList.filter((item) => item.completed);
    return shoppingList;
  }, [shoppingList, filterMode]);

  // Grouped by supermarket categories
  const categoryGroups = useMemo(() => {
    return groupShoppingItemsByCategory(displayedItems);
  }, [displayedItems]);

  // Toggle category collapse
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Handlers
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!itemName.trim()) return;

    let finalQuantity = itemQuantity.trim() || "1 unidad";
    const parsed = parseQuantity(finalQuantity);
    if (parsed) {
      finalQuantity = formatQuantity(parsed);
    }

    setShoppingList((prev) =>
      addOrMergeShoppingItem(prev, {
        name: itemName.trim(),
        quantity: finalQuantity,
        category: itemCategory,
        reason: "manual",
      })
    );

    toast.success(`"${itemName.trim()}" agregado a tu lista.`);
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
    setShoppingList((prev) =>
      addOrMergeShoppingItem(prev, {
        name: sug.name,
        category: sug.category,
        quantity: sug.quantity,
        reason: sug.reason,
        reasons: sug.reasons,
        notes: sug.notes,
      })
    );
    toast.success(`"${sug.name}" agregado a tu lista.`);
  };

  const handleAddAllSuggestions = () => {
    if (smartSuggestions.length === 0) return;
    let updated = shoppingList;
    for (const sug of smartSuggestions) {
      updated = addOrMergeShoppingItem(updated, {
        name: sug.name,
        category: sug.category,
        quantity: sug.quantity,
        reason: sug.reason,
        reasons: sug.reasons,
        notes: sug.notes,
      });
    }
    setShoppingList(updated);
    toast.success(`${smartSuggestions.length} sugerencias agregadas a la lista.`);
  };

  const handleSyncLowStock = () => {
    if (lowStockPantryItems.length === 0) {
      toast("No hay productos con poco stock en tu despensa");
      return;
    }
    setShoppingList((prev) => addLowStockToShoppingList(prev, pantryProducts));
    toast.success("Productos con stock bajo agregados a la lista", {
      description: "Se combinaron con los ítems existentes sin duplicar.",
    });
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
      `¡${createdProducts.length} ${createdProducts.length === 1 ? "producto pasado" : "productos pasados"} a la despensa!`,
      {
        description: "Se estimaron sus fechas de conservación automáticamente.",
      }
    );
  };

  // Quantity editing handlers
  const startEditingQuantity = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditingQuantityInput(item.quantity);
  };

  const saveEditedQuantity = (id: string) => {
    if (!editingQuantityInput.trim()) {
      setEditingItemId(null);
      return;
    }
    const res = updateShoppingItemQuantity(shoppingList, id, editingQuantityInput);
    if (!res) {
      toast.error("Cantidad no válida", {
        description: "Ingresá un valor numérico y unidad válida (ej. 2 unidades, 500 g, 1 litro).",
      });
      return;
    }
    setShoppingList(res.updatedList);
    setEditingItemId(null);
    toast.success(`Cantidad actualizada a ${res.formatted}`);
  };

  const handleStepQuantity = (id: string, delta: number) => {
    setShoppingList((prev) => adjustShoppingItemQuantityStep(prev, id, delta));
  };

  return (
    <div className="card-3d relative overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-[0_8px_24px_rgba(55,63,48,0.035)] sm:p-8">
      {/* 3D Top Specular Light Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand">
            <ShoppingCart size={15} /> Lista inteligente de reposición
          </div>
          <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.035em] text-content">
            Lista de compras
          </h2>
          <p className="mt-0.5 text-xs text-content-muted">
            Alimentada por tus cargas manuales, alimentos con poco stock y recetas que quieras cocinar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lowStockPantryItems.length > 0 && (
            <button
              type="button"
              onClick={handleSyncLowStock}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-border bg-brand-subtle px-3 py-2 text-xs font-bold text-brand-text transition hover:bg-brand-border/40 active:scale-[0.98]"
            >
              <RefreshCw size={14} /> Reponer stock bajo ({lowStockPantryItems.length})
            </button>
          )}

          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleMigrateCompletedToPantry}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover active:scale-[0.98]"
            >
              <PackageCheck size={16} /> Pasar comprados a la despensa ({completedCount})
            </button>
          )}
        </div>
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
              type="button"
              onClick={handleAddAllSuggestions}
              className="min-h-[44px] flex items-center text-xs font-bold text-brand underline hover:text-brand-hover"
            >
              Agregar todas
            </button>
          </div>
          <p className="mt-1 text-xs text-content-body">
            Detectamos productos consumidos en tus comidas que hoy están agotados o por vencerse:
          </p>

          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
            {smartSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="flex min-w-[210px] shrink-0 items-center justify-between rounded-xl border border-brand-border bg-surface p-2.5 shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-bold text-content">{sug.name}</p>
                  <p className="truncate text-xs text-content-muted">{sug.notes}</p>
                </div>
                <button
                  type="button"
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
          placeholder="Cantidad (ej. 2 litros, 500 g)"
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
            type="button"
            onClick={() => setFilterMode("all")}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filterMode === "all" ? "bg-brand-subtle text-brand" : "text-content-muted hover:bg-surface-elevated"
            }`}
          >
            Todos ({shoppingList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("pending")}
            className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filterMode === "pending" ? "bg-brand-subtle text-brand" : "text-content-muted hover:bg-surface-elevated"
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            type="button"
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
            type="button"
            onClick={handleClearCompleted}
            className="min-h-[44px] flex items-center text-xs font-semibold text-status-expired-text transition hover:underline"
          >
            Limpiar comprados
          </button>
        )}
      </div>

      {/* Categorized Shopping List */}
      <div className="mt-4 space-y-4">
        {categoryGroups.length > 0 ? (
          categoryGroups.map((group) => {
            const isCollapsed = Boolean(collapsedCategories[group.category]);
            return (
              <div
                key={group.category}
                className="overflow-hidden rounded-2xl border border-line bg-surface-subtle/40"
              >
                {/* Collapsible Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapse(group.category)}
                  aria-expanded={!isCollapsed}
                  className="flex min-h-[44px] w-full items-center justify-between bg-surface-subtle px-4 py-2.5 text-left transition hover:bg-surface-elevated"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronRight size={16} className="text-content-muted" />
                    ) : (
                      <ChevronDown size={16} className="text-content-muted" />
                    )}
                    <span className="font-serif text-sm font-bold tracking-tight text-content-heading">
                      {group.category}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-content-muted border border-line">
                      {group.items.length}
                    </span>
                  </div>
                  <span className="text-xs text-content-muted">
                    {isCollapsed ? "Ver pasillo" : "Ocultar"}
                  </span>
                </button>

                {/* Items in Category */}
                {!isCollapsed && (
                  <div className="divide-y divide-line/60 px-3 py-1">
                    {group.items.map((item) => {
                      const reasonBadges = getItemReasonBadges(item);
                      const isEditingThis = editingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col gap-2 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                            item.completed ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {/* Checkbox button */}
                            <button
                              type="button"
                              onClick={() => handleToggleItem(item.id)}
                              aria-label={
                                item.completed
                                  ? `Marcar ${item.name} como pendiente`
                                  : `Marcar ${item.name} como comprado`
                              }
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

                              {/* Badges for Reasons (B2) */}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {reasonBadges.map((badgeText, idx) => (
                                  <span
                                    key={idx}
                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                      badgeText === "Queda poco"
                                        ? "border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                                        : "border border-brand-border bg-brand-subtle text-brand-text"
                                    }`}
                                  >
                                    {badgeText}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Quantity control & actions */}
                          <div className="flex items-center justify-between gap-2 pl-14 sm:justify-end sm:pl-0">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingQuantityInput}
                                  onChange={(e) => setEditingQuantityInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveEditedQuantity(item.id);
                                    } else if (e.key === "Escape") {
                                      setEditingItemId(null);
                                    }
                                  }}
                                  placeholder="ej. 2 litros"
                                  autoFocus
                                  className="w-28 rounded-lg border border-brand bg-surface px-2 py-1 text-xs text-content outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveEditedQuantity(item.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover"
                                  title="Guardar cantidad"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-content-muted hover:bg-surface-elevated"
                                  title="Cancelar"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStepQuantity(item.id, -1)}
                                  aria-label={`Reducir cantidad de ${item.name}`}
                                  title="Reducir"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-content-muted hover:bg-surface-elevated hover:text-content"
                                >
                                  <Minus size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => startEditingQuantity(item)}
                                  title="Clic para editar cantidad exacta"
                                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-content-body hover:border-brand hover:text-brand"
                                >
                                  <span>{item.quantity}</span>
                                  <Pencil size={11} className="text-content-muted" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStepQuantity(item.id, 1)}
                                  aria-label={`Aumentar cantidad de ${item.name}`}
                                  title="Aumentar"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-content-muted hover:bg-surface-elevated hover:text-content"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
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
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center">
            <PackageOpen className="mx-auto text-line-strong" size={32} />
            <p className="mt-2 text-sm font-semibold text-content-body">
              {filterMode === "completed"
                ? "No hay productos comprados aún"
                : "Tu lista de compras está vacía"}
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Agregá productos manualmente, reponé los que tienen poco stock o elegí recetas en la app.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
