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

export function consumeRecipeIngredients<T extends InventoryItem>(items: T[], ingredients: string[]): ConsumptionResult<T> {
  const remaining = [...items];
  const consumed: string[] = [];
  const unmatched: string[] = [];
  ingredients.forEach((ingredient) => {
    const needle = ingredient.toLowerCase().trim();
    const targetIndex = remaining.findIndex((item) => item.name.toLowerCase().includes(needle) || needle.includes(item.name.toLowerCase()));
    if (targetIndex < 0) { unmatched.push(ingredient); return; }
    const target = remaining[targetIndex];
    const quantityMatch = target.quantity.match(/^(\d+)/);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    if (quantity > 1) remaining[targetIndex] = { ...target, quantity: target.quantity.replace(/^\d+/, String(quantity - 1)) };
    else remaining.splice(targetIndex, 1);
    consumed.push(target.name);
  });
  return { remaining, consumed, unmatched };
}
