import React, { useEffect, useState } from "react";
import { Home, PackageOpen, ScanLine, ShoppingCart } from "lucide-react";

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
  const [activeSection, setActiveSection] = useState<"summary" | "pantry" | "shopping">("summary");

  useEffect(() => {
    const sectionIds = [
      { id: "module-summary", key: "summary" as const },
      { id: "module-pantry", key: "pantry" as const },
      { id: "module-shopping", key: "shopping" as const },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the visible section with highest intersection ratio
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

  const scrollTo = (id: string, key: "summary" | "pantry" | "shopping") => {
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
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-line bg-surface/95 backdrop-blur-md px-3 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_25px_rgba(0,0,0,0.07)]"
    >
      <div className="mx-auto flex max-w-md items-center justify-between">
        {/* 1. Resumen */}
        <button
          type="button"
          data-testid="mobile-nav-summary"
          onClick={() => scrollTo("module-summary", "summary")}
          aria-current={activeSection === "summary" ? "page" : undefined}
          className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-200 active:scale-95 ${
            activeSection === "summary"
              ? "text-brand"
              : "text-content-muted hover:bg-surface-muted hover:text-content-body"
          }`}
        >
          {activeSection === "summary" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-8 rounded-full bg-accent-lime" />
          )}
          <Home size={19} strokeWidth={activeSection === "summary" ? 2.4 : 1.8} />
          <span className="text-xs leading-tight">Resumen</span>
        </button>

        {/* 2. Despensa */}
        <button
          type="button"
          data-testid="mobile-nav-pantry"
          onClick={() => scrollTo("module-pantry", "pantry")}
          aria-current={activeSection === "pantry" ? "page" : undefined}
          className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-200 active:scale-95 ${
            activeSection === "pantry"
              ? "text-brand"
              : "text-content-muted hover:bg-surface-muted hover:text-content-body"
          }`}
        >
          {activeSection === "pantry" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-8 rounded-full bg-accent-lime" />
          )}
          <div className="relative">
            <PackageOpen size={19} strokeWidth={activeSection === "pantry" ? 2.4 : 1.8} />
            {typeof pantryCount === "number" && pantryCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-lime px-1 text-[9px] font-bold text-accent-lime-fg">
                {pantryCount}
              </span>
            )}
          </div>
          <span className="text-xs leading-tight">Despensa</span>
        </button>

        {/* 3. Escanear (Botón central destacado) */}
        <div className="flex flex-1 items-center justify-center px-1">
          <button
            type="button"
            data-testid="mobile-nav-scan"
            aria-label="Escanear compra"
            onClick={onOpenScan}
            className="-mt-5 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-brand text-accent-lime shadow-[0_10px_25px_rgba(23,55,43,0.35)] border-4 border-surface-subtle transition active:scale-95 hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-accent-lime"
          >
            <ScanLine size={23} strokeWidth={2.4} />
            <span className="sr-only">Escanear compra</span>
          </button>
        </div>

        {/* 4. Compras */}
        <button
          type="button"
          data-testid="mobile-nav-shopping"
          onClick={() => scrollTo("module-shopping", "shopping")}
          aria-current={activeSection === "shopping" ? "page" : undefined}
          className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-200 active:scale-95 ${
            activeSection === "shopping"
              ? "text-brand"
              : "text-content-muted hover:bg-surface-muted hover:text-content-body"
          }`}
        >
          {activeSection === "shopping" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-8 rounded-full bg-accent-lime" />
          )}
          <div className="relative">
            <ShoppingCart size={19} strokeWidth={activeSection === "shopping" ? 2.4 : 1.8} />
            {typeof pendingShoppingCount === "number" && pendingShoppingCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-soon-bg border border-status-soon-border px-1 text-[9px] font-bold text-status-soon-text">
                {pendingShoppingCount}
              </span>
            )}
          </div>
          <span className="text-xs leading-tight">Compras</span>
        </button>
      </div>
    </nav>
  );
}
