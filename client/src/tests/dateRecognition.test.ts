import { describe, expect, it } from "vitest";
import { classifyDateContext, detectDateCandidates, type DateLearningRule } from "../lib/dateRecognition";

describe("dateRecognition", () => {
  it("diferencia elaboración, vencimiento y consumo preferente en un mismo texto", () => {
    const candidates = detectDateCandidates("ELAB: 01/09/2026 | VTO: 15/09/2026 | CONSUMIR PREFERENTEMENTE ANTES DE: 30/09/2026");
    expect(candidates.map((candidate) => candidate.label)).toEqual(["elaboración", "vencimiento", "consumo preferente"]);
  });

  it("prioriza la palabra clave más cercana a cada fecha", () => {
    const candidates = detectDateCandidates("Fecha de elaboración 01/09/2026. Fecha de vencimiento 15/09/2026.");
    expect(candidates[0]?.label).toBe("elaboración");
    expect(candidates[1]?.label).toBe("vencimiento");
  });

  it("usa la corrección aprendida como ajuste posterior", () => {
    const learning: DateLearningRule = { productKey: "Yogur natural", preferredLabel: "consumo preferente", corrections: 2, updatedAt: new Date().toISOString() };
    expect(classifyDateContext("fecha 18/09/2026", learning)).toBe("consumo preferente");
  });

  it("devuelve desconocida cuando no hay contexto útil", () => {
    expect(classifyDateContext("Lote 123 18/09/2026")).toBe("desconocida");
  });
});
