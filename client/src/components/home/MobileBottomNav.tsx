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
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-[#273f2b]/60 bg-[#30322a]/95 backdrop-blur-xl px-3 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_25px_rgba(0,0,0,0.3)] text-white"
    >
      <div className="mx-auto flex max-w-md items-center justify-between">
        {/* 1. Resumen */}
        <button
          type="button"
          data-testid="mobile-nav-summary"
          onClick={() => scrollTo("module-summary", "summary")}
          aria-current={activeSection === "summary" ? "page" : undefined}
          className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "summary"
              ? "text-[#68ef3f]"
              : "text-[#b7bda5] hover:text-white"
          }`}
        >
          {activeSection === "summary" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-7 rounded-full bg-[#68ef3f]" />
          )}
          <Home size={19} strokeWidth={activeSection === "summary" ? 2.4 : 1.8} />
          <span className="text-[11px] leading-tight">Resumen</span>
        </button>

        {/* 2. Despensa */}
        <button
          type="button"
          data-testid="mobile-nav-pantry"
          onClick={() => scrollTo("module-pantry", "pantry")}
          aria-current={activeSection === "pantry" ? "page" : undefined}
          className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "pantry"
              ? "text-[#68ef3f]"
              : "text-[#b7bda5] hover:text-white"
          }`}
        >
          {activeSection === "pantry" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-7 rounded-full bg-[#68ef3f]" />
          )}
          <div className="relative">
            <PackageOpen size={19} strokeWidth={activeSection === "pantry" ? 2.4 : 1.8} />
            {typeof pantryCount === "number" && pantryCount > 0 && (
              <span className="absolute -right-2.5 -top-2 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[#68ef3f] px-1 text-[10px] font-bold text-[#30322a] shadow-xs">
                {pantryCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight">Despensa</span>
        </button>

        {/* 3. Escanear (Botón central destacado en Electric Sprout) */}
        <div className="flex flex-1 items-center justify-center px-1">
          <button
            type="button"
            data-testid="mobile-nav-scan"
            aria-label="Escanear compra"
            onClick={onOpenScan}
            className="-mt-5 flex h-13 w-13 flex-col items-center justify-center rounded-full bg-[#68ef3f] text-[#30322a] shadow-[0_8px_20px_rgba(104,239,63,0.35)] border-4 border-[#122314] transition duration-150 active:scale-95 hover:bg-[#7cf457]"
          >
            <ScanLine size={22} strokeWidth={2.4} />
            <span className="sr-only">Escanear compra</span>
          </button>
        </div>

        {/* 4. Compras */}
        <button
          type="button"
          data-testid="mobile-nav-shopping"
          onClick={() => scrollTo("module-shopping", "shopping")}
          aria-current={activeSection === "shopping" ? "page" : undefined}
          className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition duration-150 active:scale-95 ${
            activeSection === "shopping"
              ? "text-[#68ef3f]"
              : "text-[#b7bda5] hover:text-white"
          }`}
        >
          {activeSection === "shopping" && (
            <span aria-hidden="true" className="absolute top-0 h-1 w-7 rounded-full bg-[#68ef3f]" />
          )}
          <div className="relative">
            <ShoppingCart size={19} strokeWidth={activeSection === "shopping" ? 2.4 : 1.8} />
            {typeof pendingShoppingCount === "number" && pendingShoppingCount > 0 && (
              <span className="absolute -right-2.5 -top-2 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[#fdf5e6] border border-[#edd9b4] px-1 text-[10px] font-bold text-[#7a4d0c] shadow-xs">
                {pendingShoppingCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight">Compras</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
