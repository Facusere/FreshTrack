import { describe, expect, it } from "vitest";
import { parseReceiptAndLabelText, parseDateCandidateToISO, buildSampleTickets } from "../lib/ocrScanner";

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
});
