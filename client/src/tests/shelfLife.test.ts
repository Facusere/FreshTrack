import { beforeEach, describe, expect, it } from "vitest";
import {
  clearShelfLifeCorrections,
  estimateShelfLife,
  getCategoryConservativeMinimum,
  saveShelfLifeCorrection,
} from "../lib/shelfLifeCatalog";

describe("Catálogo de Vida Útil Específica y Ajustes del Usuario (Bloque A)", () => {
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
    clearShelfLifeCorrections();
  });

  it("un producto conocido devuelve su valor específico real según FoodKeeper/ANMAT", () => {
    // Ricota: 7 días cerrado, 3 abierto
    const ricotaClosed = estimateShelfLife("Ricota", "cerrado", "Lácteos");
    expect(ricotaClosed).toBeDefined();
    expect(ricotaClosed?.days).toBe(7);
    expect(ricotaClosed?.openDays).toBe(3);
    expect(ricotaClosed?.confidence).toBe("specific");
    expect(ricotaClosed?.source).toBe("base");

    const ricotaOpen = estimateShelfLife("Ricota", "abierto", "Lácteos");
    expect(ricotaOpen?.days).toBe(3);

    // Carne picada: 2 días cerrado, 1 abierto (muy perecedero)
    const picada = estimateShelfLife("Carne picada", "cerrado", "Carnes");
    expect(picada?.days).toBe(2);
    expect(picada?.openDays).toBe(1);
    expect(picada?.confidence).toBe("specific");

    // Corte vacuno entero (asado): 4 días cerrado, 2 abierto
    const asado = estimateShelfLife("Asado de tira", "cerrado", "Carnes");
    expect(asado?.days).toBe(4);
    expect(asado?.openDays).toBe(2);
  });

  it("reconoce productos por sinónimos y alias comunes", () => {
    const yoghurt = estimateShelfLife("yogurt bebible", "cerrado");
    expect(yoghurt).toBeDefined();
    expect(yoghurt?.confidence).toBe("specific");
    expect(yoghurt?.days).toBe(14);

    const sup = estimateShelfLife("suprema de pollo", "cerrado");
    expect(sup).toBeDefined();
    expect(sup?.days).toBe(2);
  });

  it("un producto desconocido con categoría devuelve el mínimo conservador y confidence 'category-estimate'", () => {
    // Producto desconocido en Lácteos (ej. "Postre exótico de maracuyá"):
    // El mínimo conservador de Lácteos es 4 días cerrado (flan casero/postres lácteos con huevo)
    const unknownDairy = estimateShelfLife("Kéfir artesanal desconocido", "cerrado", "Lácteos");
    const minLacteos = getCategoryConservativeMinimum("Lácteos");

    expect(unknownDairy).toBeDefined();
    expect(unknownDairy?.days).toBe(minLacteos.closedDays);
    expect(unknownDairy?.openDays).toBe(minLacteos.openDays);
    expect(unknownDairy?.confidence).toBe("category-estimate");
    expect(unknownDairy?.source).toBe("category-minimum");
    expect(unknownDairy?.label).toBe("Estimado por categoría, verificá la fecha del envase");

    // En Carnes, un producto desconocido debe recibir 2 días (el mínimo de carne picada)
    const unknownMeat = estimateShelfLife("Embutido exótico misterioso", "cerrado", "Carnes");
    expect(unknownMeat?.days).toBe(2);
    expect(unknownMeat?.confidence).toBe("category-estimate");
  });

  it("un ajuste guardado por el usuario se aplica en la siguiente estimación con 'Con tu ajuste anterior'", () => {
    // 1. Inicialmente "Manzana" dura 21 días cerrado
    const initial = estimateShelfLife("Manzana roja", "cerrado", "Frutas frescas");
    expect(initial?.days).toBe(21);
    expect(initial?.confidence).toBe("specific");

    // 2. El usuario ajusta que en su casa las manzanas duran 14 días cerrado y 5 abierto
    saveShelfLifeCorrection("Manzana roja", 14, 5);

    // 3. La siguiente estimación del mismo producto prioriza el ajuste
    const afterCorrection = estimateShelfLife("Manzana roja", "cerrado", "Frutas frescas");
    expect(afterCorrection).toBeDefined();
    expect(afterCorrection?.days).toBe(14);
    expect(afterCorrection?.openDays).toBe(5);
    expect(afterCorrection?.confidence).toBe("user-correction");
    expect(afterCorrection?.source).toBe("user-correction");
    expect(afterCorrection?.label).toBe("Con tu ajuste anterior");

    // Abierto también debe usar el ajuste guardado
    const afterCorrectionOpen = estimateShelfLife("Manzana roja", "abierto", "Frutas frescas");
    expect(afterCorrectionOpen?.days).toBe(5);
  });

  it("retorna undefined si el producto no existe y no se proporcionó categoría", () => {
    const completelyUnknown = estimateShelfLife("Cosa totalmente desconocida");
    expect(completelyUnknown).toBeUndefined();
  });
});
