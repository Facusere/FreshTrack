export type QuantityFamily = "mass" | "volume" | "count" | "pack";

export type Quantity = {
  amount: number;
  unit: string;
  family: QuantityFamily;
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
};

// Mass conversions to grams
const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  gr: 1,
  grs: 1,
  gramo: 1,
  gramos: 1,
  kg: 1000,
  kgs: 1000,
  kilo: 1000,
  kilos: 1000,
  oz: 28.34952,
  onza: 28.34952,
  onzas: 28.34952,
  lb: 453.59237,
  lbs: 453.59237,
  libra: 453.59237,
  libras: 453.59237,
};

// Volume conversions to milliliters
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  mls: 1,
  mililitro: 1,
  mililitros: 1,
  cc: 1,
  l: 1000,
  lt: 1000,
  lts: 1000,
  litro: 1000,
  litros: 1000,
  // Culinary recipe units
  cucharadita: 5,
  cucharaditas: 5,
  tsp: 5,
  cucharada: 15,
  cucharadas: 15,
  tbsp: 15,
  taza: 240,
  tazas: 240,
  cup: 240,
  cups: 240,
};

const COUNT_UNITS = new Set([
  "u",
  "un",
  "unidad",
  "unidades",
  "docena",
  "docenas",
]);

const PACK_UNITS: Record<string, string> = {
  paquete: "paquete",
  paquetes: "paquete",
  paq: "paquete",
  pqt: "paquete",
  atado: "atado",
  atados: "atado",
  bandeja: "bandeja",
  bandejas: "bandeja",
  pote: "pote",
  potes: "pote",
  lata: "lata",
  latas: "lata",
  botella: "botella",
  botellas: "botella",
  caja: "caja",
  cajas: "caja",
  sachet: "sachet",
  sachets: "sachet",
  bolsa: "bolsa",
  bolsas: "bolsa",
};

/**
 * Parses numeric text including decimals (1.5 or 1,5), fractions (1/2, 1 1/2) and unicode fractions.
 */
function parseNumber(text: string): { value: number; length: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1) Mixed fraction: e.g. "1 1/2", "2 3/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den !== 0) {
      return { value: whole + num / den, length: mixedMatch[0].length };
    }
  }

  // 2) Whole + unicode fraction: e.g. "1½", "2 ¾"
  const wholeUnicodeMatch = trimmed.match(/^(\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘])/);
  if (wholeUnicodeMatch) {
    const whole = Number(wholeUnicodeMatch[1]);
    const frac = UNICODE_FRACTIONS[wholeUnicodeMatch[2]];
    if (frac !== undefined) {
      return { value: whole + frac, length: wholeUnicodeMatch[0].length };
    }
  }

  // 3) Pure fraction: e.g. "1/2", "3/4"
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den !== 0) {
      return { value: num / den, length: fracMatch[0].length };
    }
  }

  // 4) Unicode fraction only: e.g. "½"
  const unicodeChar = trimmed.charAt(0);
  if (UNICODE_FRACTIONS[unicodeChar] !== undefined) {
    return { value: UNICODE_FRACTIONS[unicodeChar], length: 1 };
  }

  // 5) Regular decimal or integer: e.g. "1.5", "1,5", "500", "0,532"
  const decMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)/);
  if (decMatch) {
    const numStr = decMatch[1].replace(",", ".");
    const val = parseFloat(numStr);
    if (!isNaN(val)) {
      return { value: val, length: decMatch[0].length };
    }
  }

  return null;
}

/**
 * Parses raw text into a structured Quantity or returns null if no valid quantity exists.
 */
export function parseQuantity(text: string): Quantity | null {
  if (!text || typeof text !== "string") return null;

  const clean = text.trim();
  const numParsed = parseNumber(clean);
  if (!numParsed) {
    return null;
  }

  const rawAmount = numParsed.value;
  const remaining = clean.slice(numParsed.length).trim().toLowerCase();

  // Extract primary unit token (word following number)
  const unitTokenMatch = remaining.match(/^[a-záéíóúñ]+/i);
  const rawUnit = unitTokenMatch ? unitTokenMatch[0].toLowerCase() : "";

  // Check Mass
  if (rawUnit && MASS_TO_GRAMS[rawUnit] !== undefined) {
    let canonicalUnit = "g";
    if (/^k/i.test(rawUnit)) canonicalUnit = "kg";
    else if (/^oz|onza/i.test(rawUnit)) canonicalUnit = "oz";
    else if (/^lb|libra/i.test(rawUnit)) canonicalUnit = "lb";

    // If unit was kg, convert amount appropriately if rawUnit was "kilo" etc.
    let amount = rawAmount;
    if (rawUnit === "kg" || rawUnit === "kgs" || rawUnit === "kilo" || rawUnit === "kilos") {
      canonicalUnit = "kg";
    } else if (rawUnit === "g" || rawUnit === "gr" || rawUnit === "grs" || rawUnit === "gramo" || rawUnit === "gramos") {
      canonicalUnit = "g";
    }

    return { amount, unit: canonicalUnit, family: "mass" };
  }

  // Check Volume
  if (rawUnit && VOLUME_TO_ML[rawUnit] !== undefined) {
    let canonicalUnit = "ml";
    if (rawUnit === "l" || rawUnit === "lt" || rawUnit === "lts" || rawUnit === "litro" || rawUnit === "litros") {
      canonicalUnit = rawAmount === 1 ? "litro" : "litros";
    } else if (rawUnit === "cc") {
      canonicalUnit = "cc";
    } else if (rawUnit.startsWith("cucharadit") || rawUnit === "tsp") {
      canonicalUnit = "cucharadita";
    } else if (rawUnit.startsWith("cucharad") || rawUnit === "tbsp") {
      canonicalUnit = "cucharada";
    } else if (rawUnit.startsWith("taza") || rawUnit.startsWith("cup")) {
      canonicalUnit = "taza";
    }

    return { amount: rawAmount, unit: canonicalUnit, family: "volume" };
  }

  // Check Count / Docena
  if (rawUnit.startsWith("docen")) {
    return {
      amount: rawAmount * 12,
      unit: rawAmount * 12 === 1 ? "unidad" : "unidades",
      family: "count",
    };
  }

  if (COUNT_UNITS.has(rawUnit)) {
    return {
      amount: rawAmount,
      unit: rawAmount === 1 ? "unidad" : "unidades",
      family: "count",
    };
  }

  // Check Pack
  if (rawUnit && PACK_UNITS[rawUnit]) {
    const basePack = PACK_UNITS[rawUnit];
    return {
      amount: rawAmount,
      unit: basePack,
      family: "pack",
    };
  }

  // If no recognized unit but there was a number, default to count: "unidad(es)"
  return {
    amount: rawAmount,
    unit: rawAmount === 1 ? "unidad" : "unidades",
    family: "count",
  };
}

/**
 * Converts a quantity to a target unit within the same family.
 * Returns null if units belong to different families.
 */
export function convertQuantity(q: Quantity, targetUnit: string): Quantity | null {
  const normTarget = targetUnit.trim().toLowerCase();

  // Mass to Mass
  if (q.family === "mass") {
    const sourceFactor = MASS_TO_GRAMS[q.unit.toLowerCase()];
    const targetFactor = MASS_TO_GRAMS[normTarget];
    if (!sourceFactor || !targetFactor) return null;

    const totalGrams = q.amount * sourceFactor;
    const targetAmount = totalGrams / targetFactor;

    let canonicalUnit = "g";
    if (normTarget.startsWith("k")) canonicalUnit = "kg";
    else if (normTarget.startsWith("oz") || normTarget.startsWith("onza")) canonicalUnit = "oz";
    else if (normTarget.startsWith("lb") || normTarget.startsWith("libra")) canonicalUnit = "lb";

    return {
      amount: targetAmount,
      unit: canonicalUnit,
      family: "mass",
    };
  }

  // Volume to Volume
  if (q.family === "volume") {
    const sourceFactor = VOLUME_TO_ML[q.unit.toLowerCase()];
    const targetFactor = VOLUME_TO_ML[normTarget];
    if (!sourceFactor || !targetFactor) return null;

    const totalMl = q.amount * sourceFactor;
    const targetAmount = totalMl / targetFactor;

    let canonicalUnit = "ml";
    if (normTarget === "l" || normTarget === "lt" || normTarget === "lts" || normTarget.startsWith("litro")) {
      canonicalUnit = targetAmount === 1 ? "litro" : "litros";
    } else if (normTarget === "cc") {
      canonicalUnit = "cc";
    }

    return {
      amount: targetAmount,
      unit: canonicalUnit,
      family: "volume",
    };
  }

  return null;
}

/**
 * Formats a number cleanly, rounding floating point inaccuracies and using commas for decimals.
 */
function formatAmountNumber(val: number): string {
  // Round to at most 2 decimal places to eliminate floating point dust like 1.7600000000000002
  const rounded = Math.round(val * 100) / 100;
  return String(rounded).replace(".", ",");
}

/**
 * Formats a quantity in natural Rioplatense Spanish.
 * - Under 1 kg -> displayed in g (e.g. 750 g)
 * - Under 1 l -> displayed in ml (e.g. 500 ml)
 * - Plural agreement: "1 litro", "2 litros", "1 unidad", "3 unidades"
 */
export function formatQuantity(q: Quantity): string {
  // Mass formatting
  if (q.family === "mass") {
    if (q.unit === "kg") {
      if (q.amount < 1) {
        const grams = Math.round(q.amount * 1000);
        return `${grams} g`;
      }
      return `${formatAmountNumber(q.amount)} kg`;
    }
    if (q.unit === "g") {
      if (q.amount >= 1000 && q.amount % 100 === 0) {
        return `${formatAmountNumber(q.amount / 1000)} kg`;
      }
      return `${formatAmountNumber(q.amount)} g`;
    }
    return `${formatAmountNumber(q.amount)} ${q.unit}`;
  }

  // Volume formatting
  if (q.family === "volume") {
    const isLiterUnit = q.unit === "l" || q.unit === "litro" || q.unit === "litros";
    if (isLiterUnit) {
      if (q.amount < 1) {
        const ml = Math.round(q.amount * 1000);
        return `${ml} ml`;
      }
      if (q.amount === 1) {
        return "1 litro";
      }
      // For fractional or whole liters
      const rounded = Math.round(q.amount * 100) / 100;
      if (Number.isInteger(rounded)) {
        return `${rounded} litros`;
      }
      return `${formatAmountNumber(rounded)} l`;
    }
    if (q.unit === "ml" || q.unit === "cc") {
      return `${formatAmountNumber(q.amount)} ${q.unit}`;
    }
    return `${formatAmountNumber(q.amount)} ${q.unit}`;
  }

  // Count formatting
  if (q.family === "count") {
    const rounded = Math.round(q.amount * 100) / 100;
    return `${formatAmountNumber(rounded)} ${rounded === 1 ? "unidad" : "unidades"}`;
  }

  // Pack formatting
  if (q.family === "pack") {
    const rounded = Math.round(q.amount * 100) / 100;
    const base = PACK_UNITS[q.unit] || q.unit;
    const plural = rounded === 1 ? base : `${base}s`;
    return `${formatAmountNumber(rounded)} ${plural}`;
  }

  return `${formatAmountNumber(q.amount)} ${q.unit}`;
}

/**
 * Determines if a quantity represents low stock.
 * Unified logic replacing shoppingList.ts and ProductRow.
 * Low condition:
 * - count or pack <= 1
 * - mass < 100 g
 * - volume < 100 ml
 * - text says "queda poco" or "último"
 * "1 kg", "1,5 kg", "2 litros" are NOT low.
 */
export function isQuantityLow(quantityOrText: Quantity | string): boolean {
  if (typeof quantityOrText === "string") {
    const text = quantityOrText.toLowerCase().trim();
    const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/\b(?:queda poco|ultimo)\b/i.test(normalized)) {
      return true;
    }
    const parsed = parseQuantity(text);
    if (!parsed) return false;
    return isQuantityLow(parsed);
  }

  const q = quantityOrText;

  if (q.family === "count" || q.family === "pack") {
    return q.amount <= 1;
  }

  if (q.family === "mass") {
    const factor = MASS_TO_GRAMS[q.unit.toLowerCase()] || 1;
    const totalGrams = q.amount * factor;
    return totalGrams < 100;
  }

  if (q.family === "volume") {
    const factor = VOLUME_TO_ML[q.unit.toLowerCase()] || 1;
    const totalMl = q.amount * factor;
    return totalMl < 100;
  }

  return false;
}
