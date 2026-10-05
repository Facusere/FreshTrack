import React, { useEffect, useState } from "react";
import { Home, PackageOpen, ScanLine, ShoppingCart, Utensils } from "lucide-react";

export interface MobileBottomNavProps {
  onOpenScan: () => void;
  pantryCount?: number;
  pendingShoppingCount?: number;
}

export function MobileBottomNav({
  onOpenScan,
  pantryCount,
  pendingShoppingCount,
}: MobileBottomNavProps) {
  const [activeSection, setActiveSection] = useState<"summary" | "pantry" | "recipes" | "shopping">("summary");

  useEffect(() => {
    const sectionIds = [
      { id: "module-summary", key: "summary" as const },
      { id: "module-pantry", key: "pantry" as const },
      { id: "module-recipes", key: "recipes" as const },
      { id: "module-shopping", key: "shopping" as const },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const matched = sectionIds.find((s) => s.id === visible[0].target.id);
          if (matched) {
            setActiveSection(matched.key);
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -40% 0px",
        threshold: [0.1, 0.3, 0.6],
      }
    );

    sectionIds.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string, key: "summary" | "pantry" | "recipes" | "shopping") => {
    setActiveSection(key);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      aria-label="Navegación inferior móvil"
      data-testid="mobile-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-line/70 bg-surface/92 backdrop-blur-xl px-2 py-1 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-colors duration-200"
    >
      <div className="mx-auto flex max-w-md items-center justify-between">
        {/* 1. Resumen */}
        <button
          type="button"
          data-testid="mobile-nav-summary"
          onClick={() => scrollTo("module-summary", "summary")}
          aria-current={activeSection === "summary" ? "page" : undefined}
          className={`relative flex min-h-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "summary"
              ? "text-brand"
              : "text-content-muted hover:text-content-heading"
          }`}
        >
          {activeSection === "summary" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-6 rounded-full bg-brand" />
          )}
          <Home size={18} strokeWidth={activeSection === "summary" ? 2.4 : 1.8} />
          <span className="text-[10px] leading-tight">Resumen</span>
        </button>

        {/* 2. Despensa */}
        <button
          type="button"
          data-testid="mobile-nav-pantry"
          onClick={() => scrollTo("module-pantry", "pantry")}
          aria-current={activeSection === "pantry" ? "page" : undefined}
          className={`relative flex min-h-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "pantry"
              ? "text-brand"
              : "text-content-muted hover:text-content-heading"
          }`}
        >
          {activeSection === "pantry" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-6 rounded-full bg-brand" />
          )}
          <div className="relative">
            <PackageOpen size={18} strokeWidth={activeSection === "pantry" ? 2.4 : 1.8} />
            {typeof pantryCount === "number" && pantryCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white shadow-xs">
                {pantryCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Despensa</span>
        </button>

        {/* 3. Escanear (Botón central destacado con gradiente esmeralda) */}
        <div className="flex flex-1 items-center justify-center px-1">
          <button
            type="button"
            data-testid="mobile-nav-scan"
            aria-label="Escanear compra"
            onClick={onOpenScan}
            className="-mt-5 flex h-13 w-13 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-[0_6px_20px_rgba(16,185,129,0.4)] border-4 border-surface transition duration-150 active:scale-95 hover:brightness-110"
          >
            <ScanLine size={21} strokeWidth={2.4} />
            <span className="sr-only">Escanear compra</span>
          </button>
        </div>

        {/* 4. Recetas */}
        <button
          type="button"
          data-testid="mobile-nav-recipes"
          onClick={() => scrollTo("module-recipes", "recipes")}
          aria-current={activeSection === "recipes" ? "page" : undefined}
          className={`relative flex min-h-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "recipes"
              ? "text-brand"
              : "text-content-muted hover:text-content-heading"
          }`}
        >
          {activeSection === "recipes" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-6 rounded-full bg-brand" />
          )}
          <Utensils size={18} strokeWidth={activeSection === "recipes" ? 2.4 : 1.8} />
          <span className="text-[10px] leading-tight">Recetas</span>
        </button>

        {/* 5. Compras */}
        <button
          type="button"
          data-testid="mobile-nav-shopping"
          onClick={() => scrollTo("module-shopping", "shopping")}
          aria-current={activeSection === "shopping" ? "page" : undefined}
          className={`relative flex min-h-[46px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "shopping"
              ? "text-brand"
              : "text-content-muted hover:text-content-heading"
          }`}
        >
          {activeSection === "shopping" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-6 rounded-full bg-brand" />
          )}
          <div className="relative">
            <ShoppingCart size={18} strokeWidth={activeSection === "shopping" ? 2.4 : 1.8} />
            {typeof pendingShoppingCount === "number" && pendingShoppingCount > 0 && (
              <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-xs">
                {pendingShoppingCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Compras</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
