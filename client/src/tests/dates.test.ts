import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  addDaysISO,
  daysUntil,
  formatExpiryDisplay,
  formatRelativeDays,
  parseDateCandidateToISO,
  statusFromDays,
  toISODate,
} from "../lib/dates";
import { deriveProduct, StoredProduct } from "../types/product";
import {
  isValidStoredProduct,
  loadStoredProducts,
  OLD_CONSUMPTION_HISTORY_KEY,
  OLD_PRODUCTS_STORAGE_KEY,
  PRODUCTS_STORAGE_KEY,
} from "../lib/storage";

describe("dates.ts - Core Date Calculations", () => {
  it("toISODate formats local calendar date without UTC drift", () => {
    // Construct local date at 23:30 (which in negative UTC offsets like UTC-3 would cross midnight in UTC)
    const localLateNight = new Date(2026, 8, 20, 23, 30, 0); // Sept 20, 2026
    expect(toISODate(localLateNight)).toBe("2026-09-20");

    const localEarlyMorning = new Date(2026, 0, 1, 0, 15, 0); // Jan 1, 2026
    expect(toISODate(localEarlyMorning)).toBe("2026-01-01");
  });

  it("daysUntil calculates midnight differences correctly across past, today, future and year boundary", () => {
    const today = new Date(2026, 8, 20, 14, 0, 0); // 2026-09-20 at 14:00

    expect(daysUntil("2026-09-10", today)).toBe(-10);
    expect(daysUntil("2026-09-19", today)).toBe(-1);
    expect(daysUntil("2026-09-20", today)).toBe(0);
    expect(daysUntil("2026-09-21", today)).toBe(1);
    expect(daysUntil("2026-09-25", today)).toBe(5);

    // Year boundary
    const newYearEve = new Date(2026, 11, 31, 10, 0, 0); // 2026-12-31
    expect(daysUntil("2027-01-01", newYearEve)).toBe(1);
    expect(daysUntil("2027-01-05", newYearEve)).toBe(5);
    expect(daysUntil("2026-12-30", newYearEve)).toBe(-1);
  });

  it("addDaysISO calculates accurate ISO target dates without clamping", () => {
    const today = new Date(2026, 8, 20); // 2026-09-20
    expect(addDaysISO(0, today)).toBe("2026-09-20");
    expect(addDaysISO(5, today)).toBe("2026-09-25");
    expect(addDaysISO(-2, today)).toBe("2026-09-18");
    expect(addDaysISO(365, today)).toBe("2027-09-20");
  });

  it("statusFromDays enforces boundaries (-1, 0, 1, 3, 4)", () => {
    expect(statusFromDays(-5)).toBe("expired");
    expect(statusFromDays(-1)).toBe("expired");
    expect(statusFromDays(0)).toBe("soon");
    expect(statusFromDays(1)).toBe("soon");
    expect(statusFromDays(2)).toBe("soon");
    expect(statusFromDays(3)).toBe("soon");
    expect(statusFromDays(4)).toBe("ok");
    expect(statusFromDays(30)).toBe("ok");
  });

  it("formatExpiryDisplay formats with or without year depending on reference year", () => {
    const ref2026 = new Date(2026, 8, 20);
    expect(formatExpiryDisplay("2026-09-18", ref2026)).toBe("18 sep");
    expect(formatExpiryDisplay("2026-12-25", ref2026)).toBe("25 dic");
    expect(formatExpiryDisplay("2027-08-12", ref2026)).toBe("12 ago 27");
    expect(formatExpiryDisplay("2025-01-01", ref2026)).toBe("1 ene 25");
  });

  it("formatRelativeDays provides localized copy for relative day counts", () => {
    expect(formatRelativeDays(0)).toBe("hoy");
    expect(formatRelativeDays(1)).toBe("mañana");
    expect(formatRelativeDays(3)).toBe("en 3 días");
    expect(formatRelativeDays(15)).toBe("en 15 días");
    expect(formatRelativeDays(-1)).toBe("hace 1 día");
    expect(formatRelativeDays(-4)).toBe("hace 4 días");
  });

  it("parseDateCandidateToISO handles valid candidates, 2-digit years, and rejects invalid calendar dates", () => {
    expect(parseDateCandidateToISO("18/09/2026")).toBe("2026-09-18");
    expect(parseDateCandidateToISO("18-09-2026")).toBe("2026-09-18");
    expect(parseDateCandidateToISO("18.09.2026")).toBe("2026-09-18");
    expect(parseDateCandidateToISO("18/09/26")).toBe("2026-09-18");
    expect(parseDateCandidateToISO("05/01/27")).toBe("2027-01-05");

    // Invalid calendar dates
    expect(parseDateCandidateToISO("31/02/2026")).toBeNull();
    expect(parseDateCandidateToISO("29/02/2025")).toBeNull(); // Non-leap year
    expect(parseDateCandidateToISO("32/01/2026")).toBeNull();
    expect(parseDateCandidateToISO("00/05/2026")).toBeNull();
    expect(parseDateCandidateToISO("15/13/2026")).toBeNull();
    expect(parseDateCandidateToISO("invalid text")).toBeNull();
  });
});

describe("product.ts - Dynamic Status & Days Derivation", () => {
  it("StoredProduct dynamically changes days, status, and expiry as today advances", () => {
    const stored: StoredProduct = {
      id: 101,
      name: "Yogur de frutilla",
      category: "Lácteos",
      expiryDate: "2026-09-20",
      quantity: "1 unidad",
      icon: "🥣",
    };

    // 5 days before expiry
    const day1 = new Date(2026, 8, 15);
    const p1 = deriveProduct(stored, day1);
    expect(p1.days).toBe(5);
    expect(p1.status).toBe("ok");
    expect(p1.expiry).toBe("20 sep");

    // 2 days before expiry (within SOON threshold <= 3)
    const day2 = new Date(2026, 8, 18);
    const p2 = deriveProduct(stored, day2);
    expect(p2.days).toBe(2);
    expect(p2.status).toBe("soon");

    // On expiry day
    const day3 = new Date(2026, 8, 20);
    const p3 = deriveProduct(stored, day3);
    expect(p3.days).toBe(0);
    expect(p3.status).toBe("soon");

    // 1 day after expiry
    const day4 = new Date(2026, 8, 21);
    const p4 = deriveProduct(stored, day4);
    expect(p4.days).toBe(-1);
    expect(p4.status).toBe("expired");
  });
});

describe("storage.ts - Persistence, Validation and Migration", () => {
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
    };
    (globalThis as any).window = { localStorage: mockStorage };
    (globalThis as any).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  it("validates StoredProduct contract and discards corrupted items", () => {
    expect(
      isValidStoredProduct({
        id: 1,
        name: "Leche",
        category: "Lácteos",
        expiryDate: "2026-09-25",
        quantity: "1 litro",
        icon: "🥛",
      })
    ).toBe(true);

    // Missing name
    expect(
      isValidStoredProduct({
        id: 1,
        name: "",
        category: "Lácteos",
        expiryDate: "2026-09-25",
        quantity: "1 litro",
        icon: "🥛",
      })
    ).toBe(false);

    // Invalid ISO date format
    expect(
      isValidStoredProduct({
        id: 1,
        name: "Leche",
        category: "Lácteos",
        expiryDate: "25/09/2026",
        quantity: "1 litro",
        icon: "🥛",
      })
    ).toBe(false);

    // Calendar invalid date in ISO format (Feb 30)
    expect(
      isValidStoredProduct({
        id: 1,
        name: "Leche",
        category: "Lácteos",
        expiryDate: "2026-02-30",
        quantity: "1 litro",
        icon: "🥛",
      })
    ).toBe(false);
  });

  it("migrates freshtrack-products-v2 to v3 with today-derived ISO expiry and removes old storage", () => {
    const today = new Date(2026, 8, 20); // 2026-09-20
    const v2Data = [
      {
        id: 1,
        name: "Tomates",
        category: "Verduras frescas",
        days: 3,
        quantity: "1 kg",
        icon: "🍅",
      },
      {
        id: 2,
        name: "Pan",
        category: "Panadería",
        days: -1,
        quantity: "1 bolsa",
        icon: "🍞",
      },
      // Corrupt item (missing name and quantity)
      { id: "corrupt" },
    ];

    localStorage.setItem(OLD_PRODUCTS_STORAGE_KEY, JSON.stringify(v2Data));
    localStorage.setItem(OLD_CONSUMPTION_HISTORY_KEY, JSON.stringify([{ id: 1 }]));

    const loaded = loadStoredProducts(today);
    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(2);

    expect(loaded![0].name).toBe("Tomates");
    expect(loaded![0].expiryDate).toBe("2026-09-23"); // 2026-09-20 + 3 days
    expect((loaded![0] as any).days).toBeUndefined();

    expect(loaded![1].name).toBe("Pan");
    expect(loaded![1].expiryDate).toBe("2026-09-19"); // 2026-09-20 - 1 day

    // Verify v2 and old consumption history are deleted
    expect(localStorage.getItem(OLD_PRODUCTS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(OLD_CONSUMPTION_HISTORY_KEY)).toBeNull();

    // Verify v3 is saved
    const rawV3 = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    expect(rawV3).not.toBeNull();
    const parsedV3 = JSON.parse(rawV3!);
    expect(parsedV3).toHaveLength(2);
  });
});
