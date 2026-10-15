import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Bell,
  Check,
  HardDrive,
  Home as HomeIcon,
  Leaf,
  Menu,
  Moon,
  PackageOpen,
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
import { DateLabel, getLearningRule, labelForDisplay, saveLearningCorrection } from "@/lib/dateRecognition";
import {
  getCatalogSize,
  ShelfLifeState,
  saveShelfLifeCorrection,
  calculateOpenProduct,
} from "@/lib/shelfLifeCatalog";
import { groupNotifications, loadNotificationPreferences, NotificationPreferences, saveNotificationPreferences } from "@/lib/notificationRules";
import {
  getRecipeDetails,
  RecipeSuggestion,
  searchRecipesByExpiring,
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
import { ConsumptionConfirmDialog } from "@/components/ConsumptionConfirmDialog";
import { ScanModal } from "@/components/ScanModal";
import { AddProductModal } from "@/components/AddProductModal";
import { InstallAppModal } from "@/components/InstallAppModal";
import { NotificationSettingsModal } from "@/components/NotificationSettingsModal";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { ProductOpenConfirmDialog } from "@/components/ProductOpenConfirmDialog";
import { RecipeDetailModal } from "@/components/RecipeDetailModal";
import {
  buildDemoProducts,
  detectProductIcon,
  inferLocation,
} from "@/lib/productHelpers";
import {
  HeroSection,
  StatsSection,
  ReportsSection,
  PantrySection,
  ShoppingSection,
  RecipesSection,
  MobileBottomNav,
} from "@/components/home";
import { recordExpiredItem } from "@/lib/reportsData";
import {
  clearNotificationDailyLimit,
  getNotificationPermission,
  notifyExpiringProducts,
  promptPWAInstall,
  subscribeToInstallPrompt,
} from "@/lib/pwaAndNotifications";
import { loadShoppingList, saveShoppingList, ShoppingItem, addRecipeMissingToShoppingList, addOrMergeShoppingItem } from "@/lib/shoppingList";

import { Product, StoredProduct, ProductStatus, deriveProduct } from "@/types/product";
import { addDaysISO, SOON_THRESHOLD_DAYS, todayISO, useToday } from "@/lib/dates";
import {
  loadStoredProducts,
  saveStoredProducts,
  loadConsumptionHistory,
  saveConsumptionHistory,
  loadLastScan,
  LastScanInfo,
} from "@/lib/storage";

export { buildDemoProducts };

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
  const [installModalOpen, setInstallModalOpen] = useState(false);
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

  const handleMoveProductLocation = (product: Product, targetLocation: string) => {
    playChimeSound("pop");
    setStoredProducts((prev) =>
      prev.map((p) => {
        if (p.id !== product.id) return p;
        let nextExpiry = p.expiryDate;
        if (targetLocation === "Freezer" && p.location !== "Freezer") {
          nextExpiry = addDaysISO(90, new Date(p.expiryDate));
        }
        return { ...p, location: targetLocation, expiryDate: nextExpiry };
      })
    );
    toast.success(`Moviste "${product.name}" a ${targetLocation}`, {
      description: targetLocation === "Freezer" ? "Se extendió automáticamente el vencimiento estimado." : undefined,
    });
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

  const removeSelected = (target?: Product) => {
    const prod = target || selectedProduct;
    if (!prod) return;
    if (prod.status === "expired" || prod.days <= 0) {
      recordExpiredItem(prod.name, prod.category);
    }
    setStoredProducts((current) => current.filter((product) => product.id !== prod.id));
    toast(`${prod.name} eliminado`, { icon: <Trash2 size={15} /> });
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

            {/* Store Style Install Button (Android, iOS, Windows, Linux) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setInstallModalOpen(true);
              }}
              title="Descargar o instalar FreshTrack (Android, iOS, Windows, Linux)"
              aria-label="Descargar o instalar app FreshTrack"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 sm:px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition shadow-xs cursor-pointer"
            >
              <Smartphone size={13} className="text-emerald-500" />
              <span className="hidden sm:inline">Instalar App</span>
              <span className="sm:hidden">App</span>
            </button>

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
                onClick={() => {
                  triggerHaptic();
                  setInstallModalOpen(true);
                  setMobileNav(false);
                }}
                className="flex min-h-[40px] w-full items-center justify-between rounded-full px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-500/20 transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Smartphone size={15} className="text-emerald-500" />
                  <span>Descargar / Instalar App</span>
                </span>
                <span className="rounded-full bg-emerald-200/70 dark:bg-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                  Android • iOS • PC
                </span>
              </button>
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
              onOpenInstall={() => setInstallModalOpen(true)}
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
      <RecipeDetailModal
        recipe={recipeDetail}
        loading={recipeDetailLoading}
        portions={recipePortions}
        setPortions={setRecipePortions}
        onClose={() => setRecipeDetail(null)}
        onInitiateConsumption={(recipe) => {
          initiateRecipeConsumption(recipe);
          setRecipeDetail(null);
        }}
        setShoppingList={setShoppingList}
      />
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
          setImpact(loadImpactStats());
          setNotificationPreferences(loadNotificationPreferences());
        }}
      />
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        canInstall={canInstallPWA}
        onInstall={promptPWAInstall}
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
      <ProductDetailDialog
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onQuickConsume={(prod) => {
          setSelectedProduct(null);
          handleQuickConsume(prod);
        }}
        onMoveLocation={(prod, targetLocation) => {
          setSelectedProduct(null);
          handleMoveProductLocation(prod, targetLocation);
        }}
        onMarkOpen={(prod) => {
          setSelectedProduct(null);
          setProductToOpen(prod);
        }}
        onEdit={(prod) => {
          setSelectedProduct(null);
          setEditingProduct(prod);
          setModal("add");
        }}
        onDelete={(prod) => {
          removeSelected(prod);
        }}
      />
      <ProductOpenConfirmDialog
        product={productToOpen}
        today={today}
        onClose={() => setProductToOpen(null)}
        onConfirm={(prod) => {
          handleConfirmOpen(prod);
          setProductToOpen(null);
        }}
      />
    </div>
  );
}
