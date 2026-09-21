import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  addDaysISO,
  daysUntil,
  formatExpiryDisplay,
  formatRelativeDays,
  formatTimeAgo,
  parseDateCandidateToISO,
  parseDateToISO,
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
  LAST_SCAN_STORAGE_KEY,
  loadLastScan,
  saveLastScan,
} from "../lib/storage";
import { loadImpactStats, recordImpact, reverseImpact } from "../lib/impactStats";

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

  describe("parseDateToISO - Table-driven generalized date parsing", () => {
    const validTestCases: Array<{
      input: string;
      expectedIso: string;
      expectedPrecision: "day" | "month";
      description: string;
    }> = [
      // Numeric formats with various separators and spaces
      { input: "12/08/2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd/mm/aaaa" },
      { input: "12/08/27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd/mm/aa" },
      { input: "12-08-2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd-mm-aaaa" },
      { input: "12-08-27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd-mm-aa" },
      { input: "12.08.2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd.mm.aaaa" },
      { input: "12.08.27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd.mm.aa" },
      { input: "12 08 2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd mm aaaa" },
      { input: "12 08 27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd mm aa" },
      { input: "12 / 08 / 2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "spaces around slashes" },

      // Text months (Spanish and English)
      { input: "12 AGO 2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd MMM aaaa (ES)" },
      { input: "12-AGO-27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd-MMM-aa (ES)" },
      { input: "12 Aug 2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd MMM aaaa (EN)" },
      { input: "15 Oct 26", expectedIso: "2026-10-15", expectedPrecision: "day", description: "dd MMM aa (EN)" },
      { input: "12 de agosto de 2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "dd de MMMM de aaaa" },
      { input: "5 de mayo del 2026", expectedIso: "2026-05-05", expectedPrecision: "day", description: "dd de MMMM del aaaa" },

      // Glued dates
      { input: "12AGO27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "glued 12AGO27" },
      { input: "12AGO2027", expectedIso: "2027-08-12", expectedPrecision: "day", description: "glued 12AGO2027" },
      { input: "12AUG28", expectedIso: "2028-08-12", expectedPrecision: "day", description: "glued 12AUG28" },

      // Month-Year only (defaults to last day of month)
      { input: "08/27", expectedIso: "2027-08-31", expectedPrecision: "month", description: "mm/aa (Aug has 31 days)" },
      { input: "08-2027", expectedIso: "2027-08-31", expectedPrecision: "month", description: "mm-aaaa" },
      { input: "AGO 2027", expectedIso: "2027-08-31", expectedPrecision: "month", description: "MMM aaaa" },
      { input: "AGO/27", expectedIso: "2027-08-31", expectedPrecision: "month", description: "MMM/aa" },
      { input: "04/27", expectedIso: "2027-04-30", expectedPrecision: "month", description: "April last day (30)" },
      { input: "02/28", expectedIso: "2028-02-29", expectedPrecision: "month", description: "leap year Feb (29)" },
      { input: "02/27", expectedIso: "2027-02-28", expectedPrecision: "month", description: "non-leap year Feb (28)" },

      // OCR digit confusion noise repair
      { input: "12/O8/2O27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "O replaced with 0" },
      { input: "l2/08/27", expectedIso: "2027-08-12", expectedPrecision: "day", description: "l replaced with 1" },
      { input: "I5/05/2026", expectedIso: "2026-05-15", expectedPrecision: "day", description: "I replaced with 1" },
    ];

    for (const tc of validTestCases) {
      it(`parses ${tc.description}: "${tc.input}" -> ${tc.expectedIso}`, () => {
        const res = parseDateToISO(tc.input);
        expect(res).not.toBeNull();
        expect(res?.iso).toBe(tc.expectedIso);
        expect(res?.precision).toBe(tc.expectedPrecision);
      });
    }

    it("detects context labels accurately with word boundaries", () => {
      const vto = parseDateToISO("VTO: 12/08/2027");
      expect(vto?.label).toBe("vencimiento");
      expect(vto?.score).toBe(10);

      const elab = parseDateToISO("ELAB 10/05/2026");
      expect(elab?.label).toBe("elaboración");
      expect(elab?.score).toBe(4);

      const pref = parseDateToISO("Consumir preferentemente antes de 12/08/27");
      expect(pref?.label).toBe("vencimiento");

      // Word boundary check: "ELOTE" must NOT match "lote"
      const elote = parseDateToISO("ELOTE 12/08/2027");
      expect(elote?.label).toBe("desconocida");
      expect(elote?.score).toBe(5);
    });

    it("rejects invalid calendar dates and out-of-range years", () => {
      expect(parseDateToISO("31/02/2027")).toBeNull(); // Feb never has 31
      expect(parseDateToISO("29/02/2027")).toBeNull(); // 2027 not leap year
      expect(parseDateToISO("31/04/2027")).toBeNull(); // Apr has 30 days
      expect(parseDateToISO("12/08/1995")).toBeNull(); // Year < 2000
      expect(parseDateToISO("12/08/2055")).toBeNull(); // Year > 2040
      expect(parseDateToISO("12/08/75")).toBeNull(); // 2-digit > 50
      expect(parseDateToISO("")).toBeNull();
      expect(parseDateToISO("lorem ipsum")).toBeNull();
    });
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

describe("storage.ts - Persistence, Validation and Migration", () => {
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

describe("impactStats.ts - Zeroed Initial Stats & Real Calculations", () => {
  it("initial impact stats start at 0 without placeholder counts", () => {
    localStorage.removeItem("freshtrack-impact-v1");
    // Dynamically import or load
    const stats = loadImpactStats();
    expect(stats.kgSaved).toBe(0);
    expect(stats.moneySaved).toBe(0);
    expect(stats.mealsSaved).toBe(0);
    expect(stats.actions).toBe(0);
  });

  it("recordImpact correctly records increments and updates storage", () => {
    localStorage.removeItem("freshtrack-impact-v1");
    const updated = recordImpact({ kg: 0.4, money: 1200, meals: 1 });
    expect(updated.kgSaved).toBe(0.4);
    expect(updated.moneySaved).toBe(1200);
    expect(updated.mealsSaved).toBe(1);
    expect(updated.actions).toBe(1);

    const second = recordImpact({ kg: 0.8, money: 2400, meals: 2 });
    expect(second.kgSaved).toBe(1.2);
    expect(second.moneySaved).toBe(3600);
    expect(second.mealsSaved).toBe(3);
    expect(second.actions).toBe(2);

    const reversed = reverseImpact({ kg: 0.4, money: 1200, meals: 1 });
    expect(reversed.kgSaved).toBe(0.8);
    expect(reversed.moneySaved).toBe(2400);
    expect(reversed.mealsSaved).toBe(2);
    expect(reversed.actions).toBe(1);
  });
});

describe("storage.ts - Last Scan Persistence & formatTimeAgo", () => {
  it("loadLastScan returns null when empty and loads saved scan accurately", () => {
    localStorage.removeItem(LAST_SCAN_STORAGE_KEY);
    expect(loadLastScan()).toBeNull();

    saveLastScan({ count: 5, at: "2026-09-20T20:00:00.000Z" });
    const loaded = loadLastScan();
    expect(loaded).not.toBeNull();
    expect(loaded?.count).toBe(5);
    expect(loaded?.at).toBe("2026-09-20T20:00:00.000Z");
  });

  it("formatTimeAgo renders relative time in Rioplatense Spanish", () => {
    const now = new Date(2026, 8, 20, 15, 0, 0); // 15:00:00

    // Just now (< 1 min)
    const justNow = new Date(2026, 8, 20, 14, 59, 30).toISOString();
    expect(formatTimeAgo(justNow, now)).toBe("recién");

    // 5 mins ago
    const fiveMin = new Date(2026, 8, 20, 14, 55, 0).toISOString();
    expect(formatTimeAgo(fiveMin, now)).toBe("hace 5 minutos");

    // 2 hours ago
    const twoHours = new Date(2026, 8, 20, 13, 0, 0).toISOString();
    expect(formatTimeAgo(twoHours, now)).toBe("hace 2 horas");

    // Yesterday
    const yesterday = new Date(2026, 8, 19, 15, 0, 0).toISOString();
    expect(formatTimeAgo(yesterday, now)).toBe("ayer");

    // 3 days ago
    const threeDays = new Date(2026, 8, 17, 15, 0, 0).toISOString();
    expect(formatTimeAgo(threeDays, now)).toBe("hace 3 días");
  });
});

