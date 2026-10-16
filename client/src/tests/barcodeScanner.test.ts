import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isBarcodeDetectorSupported,
  detectBarcodeFromImageSource,
  fetchProductByBarcode,
  mapOpenFoodFactsCategory,
} from "../lib/barcodeScanner";

describe("barcodeScanner - Detección y Consulta OpenFoodFacts", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      global.window = originalWindow;
    }
  });

  describe("isBarcodeDetectorSupported", () => {
    it("retorna true si BarcodeDetector está presente en window", () => {
      (global as any).window = { BarcodeDetector: vi.fn() };
      expect(isBarcodeDetectorSupported()).toBe(true);
    });

    it("retorna false si BarcodeDetector no está presente en window", () => {
      (global as any).window = {};
      expect(isBarcodeDetectorSupported()).toBe(false);
    });
  });

  describe("detectBarcodeFromImageSource", () => {
    it("devuelve null si BarcodeDetector no está soportado", async () => {
      (global as any).window = {};
      const result = await detectBarcodeFromImageSource({} as any);
      expect(result).toBeNull();
    });

    it("retorna el rawValue limpio si se detecta un código", async () => {
      const mockDetect = vi.fn().mockResolvedValue([{ rawValue: " 7790742330800 " }]);
      (global as any).window = {
        BarcodeDetector: vi.fn().mockImplementation(() => ({
          detect: mockDetect,
        })),
      };

      const result = await detectBarcodeFromImageSource({} as any);
      expect(result).toBe("7790742330800");
    });

    it("maneja errores de la API retornando null sin lanzar excepción", async () => {
      const mockDetect = vi.fn().mockRejectedValue(new Error("API Error"));
      (global as any).window = {
        BarcodeDetector: vi.fn().mockImplementation(() => ({
          detect: mockDetect,
        })),
      };

      const result = await detectBarcodeFromImageSource({} as any);
      expect(result).toBeNull();
    });
  });

  describe("mapOpenFoodFactsCategory", () => {
    it("categoriza correctamente lácteos", () => {
      expect(mapOpenFoodFactsCategory(["en:milks"], "leche entera")).toBe("Lácteos");
      expect(mapOpenFoodFactsCategory([], "yogur natural")).toBe("Lácteos");
      expect(mapOpenFoodFactsCategory([], "queso cremoso")).toBe("Lácteos");
    });

    it("categoriza correctamente snacks y galletitas", () => {
      expect(mapOpenFoodFactsCategory(["en:biscuits"], "galletitas de agua")).toBe("Snacks y galletitas");
      expect(mapOpenFoodFactsCategory([], "potato chips")).toBe("Snacks y galletitas");
    });

    it("categoriza correctamente enlatados y conservas", () => {
      expect(mapOpenFoodFactsCategory(["en:canned-foods"], "arvejas en conserva")).toBe("Enlatados y conservas");
    });

    it("categoriza correctamente bebidas", () => {
      expect(mapOpenFoodFactsCategory(["en:beverages"], "jugo de naranja")).toBe("Bebidas");
    });

    it("retorna 'Almacén seco' como valor por defecto", () => {
      expect(mapOpenFoodFactsCategory([], "fideos secos")).toBe("Almacén seco");
    });
  });

  describe("fetchProductByBarcode", () => {
    it("retorna null si el código es vacío o inválido", async () => {
      const res = await fetchProductByBarcode("   ");
      expect(res).toBeNull();
    });

    it("resuelve producto correctamente cuando OpenFoodFacts responde 200 OK", async () => {
      const mockProductResponse = {
        status: 1,
        product: {
          product_name: "Leche Entera Clásica",
          brands: "La Serenísima",
          categories_tags: ["en:milks"],
          quantity: "1 L",
          image_front_small_url: "https://example.com/leche.jpg",
        },
      };

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockProductResponse,
      } as any);

      const product = await fetchProductByBarcode("7790742330800");
      expect(product).not.toBeNull();
      expect(product?.name).toContain("Leche Entera Clásica");
      expect(product?.category).toBe("Lácteos");
      expect(product?.quantity).toBe("1 L");
      expect(product?.barcode).toBe("7790742330800");
    });

    it("retorna null de forma segura ante falla de red (offline)", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network offline"));
      const product = await fetchProductByBarcode("7790742330800");
      expect(product).toBeNull();
    });
  });
});
