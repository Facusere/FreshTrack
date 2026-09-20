export type InventoryItem = {
  id: number;
  name: string;
  quantity: string;
  [key: string]: unknown;
};

export type ConsumptionResult<T extends InventoryItem> = {
  remaining: T[];
  consumed: string[];
  unmatched: string[];
};

const synonymGroups = [
  ["espinaca", "espinaca fresca", "spinach"],
  ["tomate", "tomates", "tomates cherry", "tomato"],
  ["papa", "papas", "patata", "patatas", "potato"],
  ["cebolla", "cebollas", "onion"],
  ["pollo", "pechuga de pollo", "chicken", "chicken breast", "chicken_breast"],
  ["palta", "aguacate", "avocado"],
  ["leche", "leche entera", "milk"],
  ["yogur", "yogurt", "yogur natural", "natural yogurt"],
  ["aceite", "aceite de oliva", "oil", "olive oil"],
  ["arroz", "arroz largo fino", "rice"],
  ["pasta", "fideos", "pasta seca", "noodles", "spaghetti"],
  ["huevo", "huevos", "egg", "eggs"],
  ["queso", "cheese"],
  ["pan", "pan de molde", "bread"],
  ["harina", "flour"],
  ["zanahoria", "zanahorias", "carrot", "carrots"],
  ["ajo", "garlic"],
  ["manteca", "mantequilla", "butter"],
  ["carne", "carne picada", "beef", "ground beef"],
  ["pescado", "merluza", "salmón", "fish", "salmon", "tuna", "atun", "atún"],
  ["limon", "limón", "lemon", "lime"],
];

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

function canonicalIngredient(value: string) {
  const normalized = normalize(value).replace(/^(?:de|del|de la|de los|de las)\s+/i, "").trim();
  return synonymGroups.find((group) => group.some((alias) => normalized === alias || normalized.includes(alias) || alias.includes(normalized)))?.[0] || normalized;
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(",", ".");
  const mixed = normalized.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = normalized.match(/^(\d+)\/(\d+)/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const unicode: Record<string, number> = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8 };
  if (unicode[normalized]) return unicode[normalized];
  const decimal = normalized.match(/^\d+(?:\.\d+)?/);
  return decimal ? Number(decimal[0]) : 1;
}

function formatAmount(amount: number) {
  if (Number.isInteger(amount)) return String(amount);
  const fractions: Array<[number, string]> = [[0.25, "1/4"], [1 / 3, "1/3"], [0.5, "1/2"], [2 / 3, "2/3"], [0.75, "3/4"]];
  const fraction = fractions.find(([value]) => Math.abs(value - amount) < 0.01);
  return fraction ? fraction[1] : String(Number(amount.toFixed(2)));
}

function parseIngredientRequest(value: string) {
  const cleaned = value.trim();
  const match = cleaned.match(/^([\d.,]+\s+[\d]+\/[\d]+|[\d]+\/[\d]+|[\d.,]+|[½⅓⅔¼¾⅕⅖⅗⅘])\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?\s*(.*)$/);
  if (!match) return { amount: 1, name: cleaned };
  const rawName = (match[3] || match[2] || cleaned).replace(/^(?:de|del|de la|de los|de las)\s+/i, "").trim();
  return { amount: parseAmount(match[1]), name: rawName || cleaned };
}

function consumeOneQuantity(quantity: string, requestedAmount = 1) {
  const match = quantity.match(/^\s*([\d.,]+\s+\d+\/\d+|\d+\/\d+|[\d.,]+|[½⅓⅔¼¾⅕⅖⅗⅘])(?:\s*(.*))?$/);
  if (!match) return null;
  const amount = parseAmount(match[1]);
  const rest = (match[2] || "").trim();
  const hasSpace = /^\s*[\d.,\/½⅓⅔¼¾⅕⅖⅗⅘]+\s+/.test(quantity);
  const remaining = amount - requestedAmount;
  return remaining <= 0.001 ? null : `${formatAmount(remaining)}${rest ? (hasSpace ? ` ${rest}` : ` ${rest}`) : ""}`;
}

export function consumeRecipeIngredients<T extends InventoryItem>(items: T[], ingredients: string[]): ConsumptionResult<T> {
  const remaining = [...items];
  const consumed: string[] = [];
  const unmatched: string[] = [];
  ingredients.forEach((ingredient) => {
    const request = parseIngredientRequest(ingredient);
    const ingredientKey = canonicalIngredient(request.name);
    const targetIndex = remaining.findIndex((item) => {
      const itemKey = canonicalIngredient(item.name);
      return itemKey === ingredientKey || itemKey.includes(ingredientKey) || ingredientKey.includes(itemKey);
    });
    if (targetIndex < 0) { unmatched.push(ingredient); return; }
    const target = remaining[targetIndex];
    const nextQuantity = consumeOneQuantity(target.quantity, request.amount);
    if (nextQuantity === null) remaining.splice(targetIndex, 1);
    else remaining[targetIndex] = { ...target, quantity: nextQuantity };
    consumed.push(target.name);
  });
  return { remaining, consumed, unmatched };
}
