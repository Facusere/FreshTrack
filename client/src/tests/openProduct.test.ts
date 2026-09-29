import { describe, expect, it } from "vitest";
import { addDaysISO, todayISO } from "../lib/dates";
import {
  calculateOpenProduct,
  estimateShelfLife,
  isFreshProduceCategory,
} from "../lib/shelfLifeCatalog";
import { StoredProduct } from "../types/product";

describe("Bloque A: Marcar producto como abierto y perecederos frescos", () => {
  const baseToday = new Date(2026, 8, 29); // 2026-09-29

  it("abrir un producto acorta la fecha según el catálogo", () => {
    // Yogur en pote: closedDays 21, openDays 4
    const product: StoredProduct = {
      id: 1,
      name: "Yogur entero",
      category: "Lácteos",
      expiryDate: addDaysISO(12, baseToday), // 12 días restantes
      quantity: "1 pote",
      icon: "🥣",
      state: "cerrado",
    };

    const result = calculateOpenProduct(product, baseToday);

    expect(result.updatedProduct.state).toBe("abierto");
    expect(result.updatedProduct.openedAt).toBe(todayISO(baseToday));
    expect(result.newDays).toBe(4);
    expect(result.newExpiryDate).toBe(addDaysISO(4, baseToday));
    expect(result.previousDays).toBe(12);
  });

  it("abrir uno que ya tenía menos días que openDays no la alarga", () => {
    // Leche fluida: openDays = 3. Si le quedaba 1 día, debe mantenerse en 1 día (min(1, 3))
    const product: StoredProduct = {
      id: 2,
      name: "Leche sachet",
      category: "Lácteos",
      expiryDate: addDaysISO(1, baseToday),
      quantity: "1 sachet",
      icon: "🥛",
      state: "cerrado",
    };

    const result = calculateOpenProduct(product, baseToday);

    expect(result.updatedProduct.state).toBe("abierto");
    expect(result.newDays).toBe(1);
    expect(result.newExpiryDate).toBe(addDaysISO(1, baseToday));
    expect(result.newExpiryDate).toBe(product.expiryDate);
  });

  it("producto sin entrada específica muestra el aviso de estimado", () => {
    // Producto desconocido en categoría Lácteos
    const product: StoredProduct = {
      id: 3,
      name: "Quesillo artesanal misterioso",
      category: "Lácteos",
      expiryDate: addDaysISO(15, baseToday),
      quantity: "1 unidad",
      icon: "🧀",
      state: "cerrado",
    };

    const result = calculateOpenProduct(product, baseToday);

    expect(result.confidence).toBe("category-estimate");
    expect(result.warningNotice).toBeDefined();
    expect(result.warningNotice).toContain("Estimado por categoría");
    expect(result.warningNotice).toContain("días abierto, puede variar");
  });

  it("alta de un perecedero 'ya pasado' usa el valor corto (agingDays)", () => {
    // Espinaca fresca: closedDays: 5, agingDays: 2
    const normal = estimateShelfLife("Espinaca fresca", "cerrado", "Verduras frescas", "fresco");
    expect(normal).toBeDefined();
    expect(normal?.days).toBe(5);

    const pasado = estimateShelfLife("Espinaca fresca", "cerrado", "Verduras frescas", "pasado");
    expect(pasado).toBeDefined();
    expect(pasado?.days).toBe(2);
    expect(pasado?.days).toBeLessThan(normal!.days);

    // Tomates cherry: closedDays: 6, agingDays: 2
    const tomatePasado = estimateShelfLife("Tomates cherry", "cerrado", "Verduras frescas", "pasado");
    expect(tomatePasado?.days).toBe(2);

    // Verificar helper de perecederos frescos
    expect(isFreshProduceCategory("Verduras frescas")).toBe(true);
    expect(isFreshProduceCategory("Frutas frescas")).toBe(true);
    expect(isFreshProduceCategory("Panadería")).toBe(true);
    expect(isFreshProduceCategory("Lácteos")).toBe(false);
  });
});
