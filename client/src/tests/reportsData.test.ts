import { describe, it, expect, beforeEach } from "vitest";
import {
  buildMonthlyWasteData,
  buildCategoryWasteData,
  buildTopExpiredProducts,
  hasSufficientReportsData,
  recordExpiredItem,
} from "../lib/reportsData";
import { Product } from "@/types/product";
import { ImpactStats } from "../lib/impactStats";

describe("reportsData calculations", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    };
    globalThis.localStorage = mockStorage as any;
  });

  const mockImpact: ImpactStats = {
    month: "2026-09",
    kgSaved: 2.4,
    moneySaved: 7200,
    mealsSaved: 6,
    actions: 6,
  };

  const mockProducts: Product[] = [
    {
      id: 1,
      name: "Leche entera",
      category: "Lácteos",
      expiryDate: "2026-09-20",
      days: -2,
      status: "expired",
      quantity: "1 unidad",
      icon: "🥛",
      expiry: "20 sep",
      estimated: false,
    },
    {
      id: 2,
      name: "Yogur natural",
      category: "Lácteos",
      expiryDate: "2026-09-21",
      days: -1,
      status: "expired",
      quantity: "2 unidades",
      icon: "🥣",
      expiry: "21 sep",
      estimated: false,
    },
    {
      id: 3,
      name: "Tomates cherry",
      category: "Verduras frescas",
      expiryDate: "2026-09-24",
      days: 2,
      status: "soon",
      quantity: "1 bandeja",
      icon: "🍅",
      expiry: "24 sep",
      estimated: false,
    },
  ];

  it("builds monthly waste avoided points with actual data and projection", () => {
    const today = new Date(2026, 8, 22); // Sept 22, 2026
    const data = buildMonthlyWasteData(mockImpact, today);

    expect(data.length).toBe(4);
    // Current month is September
    const current = data[data.length - 1];
    expect(current.kg).toBe(2.4);
    expect(current.pesos).toBe(7200);
    expect(current.isProjection).toBe(false);

    // Prior months are projections
    expect(data[0].isProjection).toBe(true);
    expect(data[0].kg).toBeGreaterThan(0);
  });

  it("aggregates categories with most expired products", () => {
    recordExpiredItem("Pechuga de pollo", "Carnes");
    const categoryData = buildCategoryWasteData(mockProducts);

    expect(categoryData.length).toBe(2);
    // Lácteos has 2 (Leche + Yogur), Carnes has 1 (from history)
    expect(categoryData[0].category).toBe("Lácteos");
    expect(categoryData[0].count).toBe(2);
    expect(categoryData[1].category).toBe("Carnes");
    expect(categoryData[1].count).toBe(1);
    expect(categoryData[0].percentage + categoryData[1].percentage).toBe(100);
  });

  it("ranks top 5 most expired products", () => {
    recordExpiredItem("Leche entera", "Lácteos");
    const top = buildTopExpiredProducts(mockProducts);

    expect(top.length).toBe(2);
    // Leche has 1 active + 1 historical = 2
    expect(top[0].name).toBe("Leche entera");
    expect(top[0].count).toBe(2);
    expect(top[0].rank).toBe(1);

    expect(top[1].name).toBe("Yogur natural");
    expect(top[1].count).toBe(1);
    expect(top[1].rank).toBe(2);
  });

  it("evaluates hasSufficientReportsData correctly", () => {
    const emptyImpact: ImpactStats = {
      month: "2026-09",
      kgSaved: 0,
      moneySaved: 0,
      mealsSaved: 0,
      actions: 0,
    };
    const emptyProducts: Product[] = [];

    expect(hasSufficientReportsData(emptyImpact, emptyProducts, [])).toBe(false);

    expect(hasSufficientReportsData(mockImpact, emptyProducts, [])).toBe(true);
    expect(hasSufficientReportsData(emptyImpact, mockProducts, [])).toBe(true);
  });
});
