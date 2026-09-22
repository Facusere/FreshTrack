import { describe, expect, it, vi } from "vitest";
import Tesseract from "tesseract.js";
import {
  parseReceiptAndLabelText,
  parseDateCandidateToISO,
  buildSampleTickets,
  extractQuantityFromTicketLine,
  applyGrayscaleAndContrast,
  performBrowserOCR,
} from "../lib/ocrScanner";

describe("ocrScanner - Receipt & Label Parsing", () => {
  const mockDetectIcon = (name: string) => (name.includes("Leche") ? "🥛" : "📦");
  const fixedToday = new Date(2026, 8, 20); // 2026-09-20
  const sampleTickets = buildSampleTickets(fixedToday);

  it("parses date candidates properly to ISO date", () => {
    const result = parseDateCandidateToISO("20/12/2026");
    expect(result).toBe("2026-12-20");
  });

  it("extracts catalog products and quantities from supermarket ticket text", () => {
    const ticket = sampleTickets[0].text;
    const products = parseReceiptAndLabelText(ticket, mockDetectIcon, fixedToday);

    expect(products.length).toBeGreaterThanOrEqual(3);

    const leche = products.find((p) => p.name.toLowerCase().includes("leche entera"));
    expect(leche).toBeDefined();
    expect(leche?.category).toBe("Lácteos");
    expect(leche?.estimated).toBe(true);
    expect(leche?.expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const pan = products.find((p) => p.name.toLowerCase().includes("pan de molde"));
    expect(pan).toBeDefined();
    expect(pan?.category).toBe("Panadería");
    expect(pan?.expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const arroz = products.find((p) => p.name.toLowerCase().includes("arroz largo fino"));
    expect(arroz).toBeDefined();
    expect(arroz?.category).toBe("Almacén seco");
    expect(arroz?.expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("extracts explicit expiry date from product packaging label", () => {
    const label = sampleTickets[1].text;
    const products = parseReceiptAndLabelText(label, mockDetectIcon, fixedToday);

    expect(products.length).toBeGreaterThanOrEqual(1);
    const yogur = products.find((p) => p.name.toLowerCase().includes("yogur"));
    expect(yogur).toBeDefined();
    // Expiry was explicitly present in label text (VENCE: 22/09/2026)
    expect(yogur?.dateLabel).toBe("vencimiento");
    expect(yogur?.estimated).toBe(false);
    expect(yogur?.expiryDate).toBe("2026-09-22");
  });

  describe("extractQuantityFromTicketLine - Ticket Quantity Extraction", () => {
    const ticketCases: Array<{
      line: string;
      expectedQuantity: string;
      expectedCleanName: string;
      description: string;
    }> = [
      {
        line: "2 LECHE ENTERA 1L $ 1.250",
        expectedQuantity: "2 litros",
        expectedCleanName: "LECHE ENTERA",
        description: "multiplier and volume container with price",
      },
      {
        line: "1.500 KG TOMATE REDONDO $ 4.500",
        expectedQuantity: "1,5 kg",
        expectedCleanName: "TOMATE REDONDO",
        description: "leading weight with decimal period and price",
      },
      {
        line: "TOMATE REDONDO 1,500 KG $ 4.500",
        expectedQuantity: "1,5 kg",
        expectedCleanName: "TOMATE REDONDO",
        description: "trailing weight with decimal comma and price",
      },
      {
        line: "3 HARINA 000 1KG $1500",
        expectedQuantity: "3 kg",
        expectedCleanName: "HARINA 000",
        description: "multiplier with product name containing 000 and 1KG container",
      },
      {
        line: "QUESO CREMOSO 0,425 kg x $4500",
        expectedQuantity: "425 g",
        expectedCleanName: "QUESO CREMOSO",
        description: "sub-kg weight converted to grams with unit multiplier price",
      },
      {
        line: "YOGUR SER 4X120G",
        expectedQuantity: "480 g",
        expectedCleanName: "YOGUR SER",
        description: "pack multiplier expression 4X120G",
      },
      {
        line: "2 PAN LACTAL $2.100",
        expectedQuantity: "2 unidades",
        expectedCleanName: "PAN LACTAL",
        description: "count multiplier without container unit",
      },
      {
        line: "GALLETITAS DIVERSAS ART 12345 $850",
        expectedQuantity: "1 unidad",
        expectedCleanName: "GALLETITAS DIVERSAS",
        description: "article code and price stripped, defaulting to 1 unidad",
      },
      {
        line: "7791234567890 ARROZ LARGO FINO 1KG $1200",
        expectedQuantity: "1 kg",
        expectedCleanName: "ARROZ LARGO FINO",
        description: "EAN barcode and price stripped with 1KG container",
      },
      {
        line: "3 X 1L JUGO DE NARANJA $3000",
        expectedQuantity: "3 litros",
        expectedCleanName: "JUGO DE NARANJA",
        description: "multiplied volume container 3 X 1L",
      },
      {
        line: "MANZANA ROJA 2 KG",
        expectedQuantity: "2 kg",
        expectedCleanName: "MANZANA ROJA",
        description: "clean weight without price",
      },
    ];

    for (const tc of ticketCases) {
      it(`extracts quantity from "${tc.line}" -> ${tc.expectedQuantity} (${tc.expectedCleanName})`, () => {
        const { quantity, cleanName } = extractQuantityFromTicketLine(tc.line);
        expect(quantity).toBe(tc.expectedQuantity);
        expect(cleanName).toBe(tc.expectedCleanName);
      });
    }
  });

  describe("applyGrayscaleAndContrast - Image Preprocessing", () => {
    it("converts RGB channels to grayscale using standard luminance weights", () => {
      // Single red pixel [255, 0, 0, 255]
      // Gray = Math.round(0.299 * 255) = 76
      const mockImage = {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([255, 0, 0, 255]),
      };
      applyGrayscaleAndContrast(mockImage);

      expect(mockImage.data[0]).toBe(mockImage.data[1]);
      expect(mockImage.data[1]).toBe(mockImage.data[2]);
    });

    it("stretches contrast dynamically across min and max pixel luminance", () => {
      // 2 pixels: low contrast dark gray (50) and medium gray (100)
      const mockImage = {
        width: 2,
        height: 1,
        data: new Uint8ClampedArray([
          50, 50, 50, 255,
          100, 100, 100, 255,
        ]),
      };

      applyGrayscaleAndContrast(mockImage);

      // Pixel 0 should stretch towards 0
      expect(mockImage.data[0]).toBeLessThanOrEqual(5);
      // Pixel 1 should stretch towards 255
      expect(mockImage.data[4]).toBeGreaterThanOrEqual(250);
    });
  });

  describe("performBrowserOCR - Offline Error Handling", () => {
    it("throws a user-friendly error if OCR initialization fails", async () => {
      const spy = vi.spyOn(Tesseract, "createWorker").mockRejectedValueOnce(new Error("Worker failed"));
      await expect(performBrowserOCR("invalid-image-source")).rejects.toThrow(
        "No se pudo inicializar el escáner"
      );
      spy.mockRestore();
    });
  });
});

