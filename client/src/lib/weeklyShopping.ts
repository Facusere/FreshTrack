import { LocalRecipe } from "./localRecipesMatching";
import { PlannedMeal } from "./mealPlan";
import { Product, StoredProduct } from "@/types/product";
import { daysUntil } from "./dates";
import { normalizeText, matchIngredientTokens } from "./ingredientMatching";
import { isNonNumericSpice } from "./inventoryConsumption";
import {
  convertQuantity,
  formatQuantity,
  parseQuantity,
  Quantity,
} from "./quantity";
import {
  addOrMergeShoppingItem,
  ShoppingItem,
} from "./shoppingList";
import { estimateShelfLife } from "./shelfLifeCatalog";

export interface WeeklyShoppingPreviewItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  recipeNames: string[];
  inPantryNote?: string;
  checked: boolean;
}

/**
 * Escala una medida textual de cantidad según el factor de porciones.
 */
export function scaleMeasure(measure: string, factor: number): string {
  if (factor === 1 || !measure) return measure;
  let res = measure.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(",", "."));
    if (isNaN(num)) return match;
    const scaled = Math.round(num * factor * 10) / 10;
    return String(scaled).replace(".", ",");
  });
  // Concordancia singular cuando el resultado es 1
  res = res.replace(/\b1\s+unidades\b/g, "1 unidad");
  return res;
}

type InternalIngredientNeed = {
  rawName: string;
  category: string;
  recipeName: string;
  quantity: Quantity | null;
  rawQuantityStr: string;
};

/**
 * Calcula los ingredientes necesarios para todas las recetas planificadas en una semana,
 * resta las existencias disponibles en la despensa (sin contar vencidos) y evita descontar
 * dos veces el mismo producto para recetas distintas.
 */
export function calculateWeeklyShoppingIngredients(
  meals: PlannedMeal[],
  recipes: LocalRecipe[],
  pantry: Array<Product | StoredProduct>,
  today: Date = new Date()
): WeeklyShoppingPreviewItem[] {
  if (!meals.length) return [];

  const recipeMap = new Map<string, LocalRecipe>(recipes.map((r) => [r.id, r]));

  // 1. Recolectar todos los ingredientes demandados con sus porciones escaladas
  const needs: InternalIngredientNeed[] = [];

  for (const meal of meals) {
    const recipe = recipeMap.get(meal.recipeId);
    if (!recipe) continue;

    // Recetas base calculadas para 2 porciones
    const factor = (meal.portions || 2) / 2;

    for (const ing of recipe.ingredients) {
      const rawMeasure = (ing.quantity || "1 unidad").trim();

      // Ignorar condimentos o especias no numéricas ("a gusto", "pizca")
      if (isNonNumericSpice(rawMeasure)) {
        continue;
      }

      const scaledMeasure = scaleMeasure(rawMeasure, factor);
      const parsed = parseQuantity(scaledMeasure);

      needs.push({
        rawName: ing.name.trim(),
        category: recipe.category || "Almacén seco",
        recipeName: recipe.name,
        quantity: parsed,
        rawQuantityStr: scaledMeasure,
      });
    }
  }

  // 2. Agrupar por ingrediente normalizado y sumar cantidades convertibles
  type GroupedNeed = {
    canonicalName: string;
    normalizedName: string;
    category: string;
    recipeNames: Set<string>;
    parsedQuantities: Quantity[];
    unparsedQuantities: string[];
  };

  const groups = new Map<string, GroupedNeed>();

  for (const need of needs) {
    const norm = normalizeText(need.rawName);
    let group = groups.get(norm);

    if (!group) {
      // Buscar si existe un sinónimo cercano con matchIngredientTokens
      for (const [key, existing] of Array.from(groups.entries())) {
        const match = matchIngredientTokens(key, norm);
        if (match.score >= 75) {
          group = existing;
          break;
        }
      }
    }

    if (!group) {
      group = {
        canonicalName: need.rawName,
        normalizedName: norm,
        category: need.category,
        recipeNames: new Set([need.recipeName]),
        parsedQuantities: [],
        unparsedQuantities: [],
      };
      groups.set(norm, group);
    } else {
      group.recipeNames.add(need.recipeName);
    }

    if (need.quantity) {
      group.parsedQuantities.push(need.quantity);
    } else {
      group.unparsedQuantities.push(need.rawQuantityStr);
    }
  }

  // 3. Preparar copia de despensa activa (excluyendo productos vencidos) para descontar stock
  type WorkingPantryItem = {
    id: string | number;
    name: string;
    normalized: string;
    quantity: Quantity | null;
  };

  const workingPantry: WorkingPantryItem[] = pantry
    .filter((p) => {
      if ("status" in p && p.status === "expired") return false;
      if (p.expiryDate && daysUntil(p.expiryDate, today) < 0) return false;
      return true;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      normalized: normalizeText(p.name),
      quantity: parseQuantity(p.quantity),
    }));

  const results: WeeklyShoppingPreviewItem[] = [];

  // 4. Procesar cada grupo de ingrediente: sumar totales y restar despensa
  for (const group of Array.from(groups.values())) {
    // Sumar parsedQuantities por familia
    const byFamily = new Map<string, Quantity[]>();
    for (const q of group.parsedQuantities) {
      const list = byFamily.get(q.family) || [];
      list.push(q);
      byFamily.set(q.family, list);
    }

    // Para cada familia sumamos las cantidades
    const consolidatedFamilyQuantities: Quantity[] = [];

    for (const [family, qList] of Array.from(byFamily.entries())) {
      if (family === "mass") {
        let totalGrams = 0;
        for (const q of qList) {
          const inGrams = convertQuantity(q, "g");
          if (inGrams) totalGrams += inGrams.amount;
        }
        consolidatedFamilyQuantities.push({
          amount: totalGrams,
          unit: "g",
          family: "mass",
        });
      } else if (family === "volume") {
        let totalMl = 0;
        for (const q of qList) {
          const inMl = convertQuantity(q, "ml");
          if (inMl) totalMl += inMl.amount;
        }
        consolidatedFamilyQuantities.push({
          amount: totalMl,
          unit: "ml",
          family: "volume",
        });
      } else if (family === "count") {
        let totalCount = 0;
        for (const q of qList) {
          totalCount += q.amount;
        }
        consolidatedFamilyQuantities.push({
          amount: totalCount,
          unit: totalCount === 1 ? "unidad" : "unidades",
          family: "count",
        });
      } else {
        // pack u otras: agrupar por unidad base
        const byUnit = new Map<string, number>();
        for (const q of qList) {
          byUnit.set(q.unit, (byUnit.get(q.unit) || 0) + q.amount);
        }
        for (const [unit, amount] of Array.from(byUnit.entries())) {
          consolidatedFamilyQuantities.push({
            amount,
            unit,
            family: "pack",
          });
        }
      }
    }

    // 5. Restar stock de la despensa de manera secuencial para no duplicar descuentos
    let pantryNote = "";

    for (const item of consolidatedFamilyQuantities) {
      // Buscar en workingPantry un producto compatible
      for (const pItem of workingPantry) {
        if (!pItem.quantity || pItem.quantity.amount <= 0) continue;
        if (pItem.quantity.family !== item.family) continue;

        const match = matchIngredientTokens(pItem.name, group.canonicalName);
        if (match.score < 75) continue;

        // Descontar según la familia
        if (item.family === "mass") {
          const pGrams = convertQuantity(pItem.quantity, "g");
          if (!pGrams || pGrams.amount <= 0) continue;

          const toDeduct = Math.min(item.amount, pGrams.amount);
          item.amount -= toDeduct;
          pGrams.amount -= toDeduct;
          pItem.quantity = { ...pGrams, unit: "g" };
          pantryNote = `Tenés ${Math.round(toDeduct)} g en despensa`;
        } else if (item.family === "volume") {
          const pMl = convertQuantity(pItem.quantity, "ml");
          if (!pMl || pMl.amount <= 0) continue;

          const toDeduct = Math.min(item.amount, pMl.amount);
          item.amount -= toDeduct;
          pMl.amount -= toDeduct;
          pItem.quantity = { ...pMl, unit: "ml" };
          pantryNote = `Tenés ${Math.round(toDeduct)} ml en despensa`;
        } else if (item.family === "count" || item.family === "pack") {
          const toDeduct = Math.min(item.amount, pItem.quantity.amount);
          item.amount -= toDeduct;
          pItem.quantity.amount -= toDeduct;
          pantryNote = `Tenés ${toDeduct} en despensa`;
        }

        if (item.amount <= 0) {
          break;
        }
      }

      // Si después de restar queda cantidad pendiente de compra
      if (item.amount > 0) {
        const formatted = formatQuantity(item);
        const estimatedShelf = estimateShelfLife(group.canonicalName, "cerrado");

        results.push({
          id: `weekly-${group.normalizedName}-${item.family}-${Math.random().toString(36).slice(2, 6)}`,
          name: capitalize(group.canonicalName),
          category: estimatedShelf?.category || "Almacén seco",
          quantity: formatted,
          recipeNames: Array.from(group.recipeNames),
          inPantryNote: pantryNote || undefined,
          checked: true,
        });
      }
    }

    // Agregar cantidades no parseables si quedaron (manteniendo líneas separadas sin inventar)
    for (const raw of group.unparsedQuantities) {
      results.push({
        id: `weekly-unparsed-${Math.random().toString(36).slice(2, 6)}`,
        name: capitalize(group.canonicalName),
        category: "Almacén seco",
        quantity: raw,
        recipeNames: Array.from(group.recipeNames),
        checked: true,
      });
    }
  }

  return results;
}

/**
 * Agrega los ítems seleccionados del planificador a la lista de compras del usuario,
 * fusionando duplicados con addOrMergeShoppingItem y acumulando los nombres de receta.
 */
export function addWeeklyItemsToShoppingList(
  currentList: ShoppingItem[],
  selectedItems: WeeklyShoppingPreviewItem[]
): ShoppingItem[] {
  let list = [...currentList];

  for (const item of selectedItems) {
    if (!item.checked) continue;

    for (const recipeName of item.recipeNames) {
      list = addOrMergeShoppingItem(list, {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        reason: "receta",
        recipeName,
        notes: `Plan semanal: ${recipeName}`,
      });
    }
  }

  return list;
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
