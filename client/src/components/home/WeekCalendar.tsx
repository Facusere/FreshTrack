import React from "react";
import { toast } from "sonner";
import { Product } from "@/types/product";
import { formatRelativeDays } from "@/lib/dates";

export interface WeekCalendarProps {
  products: Product[];
}

export function WeekCalendar({ products }: { products: Product[] }) {
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const now = new Date();
  const calendar = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(now);
    d.setDate(now.getDate() + index);
    const label =
      index === 0
        ? `Hoy · ${d.getDate()} ${monthNames[d.getMonth()]}`
        : `${dayNames[d.getDay()]} · ${d.getDate()} ${monthNames[d.getMonth()]}`;
    return { label, index };
  });

  const productsByDay = calendar.map(({ label, index }) => ({
    day: label,
    products: products.filter(
      (product) => product.days === index || (index === 0 && product.days < 0)
    ),
  }));

  return (
    <div className="mt-5 grid gap-2 overflow-x-auto pb-1 sm:grid-cols-7">
      {productsByDay.map(({ day, products: dayProducts }, index) => (
        <div
          key={day}
          className={`min-w-[126px] rounded-2xl border p-3 ${
            index === 0 ? "border-brand-border bg-brand-subtle/50" : "border-line bg-surface"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-content-muted">{day}</p>
            {dayProducts.length > 0 && (
              <span className="rounded-full bg-brand-subtle px-1.5 py-0.5 text-xs font-bold text-brand-text">
                {dayProducts.length}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {dayProducts.length ? (
              dayProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() =>
                    toast(product.name, {
                      description: `${product.category} · ${formatRelativeDays(product.days)}`,
                    })
                  }
                  className="w-full rounded-xl bg-surface-elevated p-2 text-left transition hover:bg-brand-subtle/40"
                >
                  <span className="text-base">{product.icon}</span>
                  <p className="mt-1 truncate text-xs font-semibold text-content-heading">{product.name}</p>
                  <p className="mt-0.5 truncate text-xs text-content-muted">{product.category}</p>
                </button>
              ))
            ) : (
              <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-line text-center text-xs leading-4 text-content-muted">
                Sin urgencias
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
