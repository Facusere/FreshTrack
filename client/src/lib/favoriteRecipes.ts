import { LOCAL_RECIPES, LocalRecipe } from "./localRecipesMatching";
import { loadJSON, saveJSON } from "./storage";

export const FAVORITE_RECIPES_STORAGE_KEY = "freshtrack-favorite-recipes-v1";

/**
 * Filtra los IDs de recetas descartando aquellos que ya no existan en el recetario.
 */
export function cleanOrphanFavorites(
  favoriteIds: string[],
  validRecipes: LocalRecipe[] = LOCAL_RECIPES
): string[] {
  if (!Array.isArray(favoriteIds)) return [];
  const validSet = new Set(validRecipes.map((r) => r.id));
  return favoriteIds.filter((id) => typeof id === "string" && validSet.has(id));
}

/**
 * Carga la lista de favoritos desde localStorage, limpiando IDs huérfanos.
 * Tolera datos corruptos o almacenamiento lleno retornando array vacío.
 */
export function loadFavorites(validRecipes: LocalRecipe[] = LOCAL_RECIPES): string[] {
  const loaded = loadJSON<string[]>(FAVORITE_RECIPES_STORAGE_KEY, []);
  return cleanOrphanFavorites(loaded, validRecipes);
}

/**
 * Guarda la lista de favoritos en localStorage de forma segura con saveJSON.
 */
export function saveFavorites(favoriteIds: string[]): boolean {
  if (!Array.isArray(favoriteIds)) return false;
  return saveJSON(FAVORITE_RECIPES_STORAGE_KEY, favoriteIds);
}

/**
 * Conmuta el estado de favorito de una receta (pura, no muta el array recibido).
 */
export function toggleFavorite(
  recipeId: string,
  currentFavorites: string[]
): string[] {
  if (!recipeId) return currentFavorites;
  const set = new Set(currentFavorites);
  if (set.has(recipeId)) {
    set.delete(recipeId);
  } else {
    set.add(recipeId);
  }
  return Array.from(set);
}

/**
 * Verifica si una receta está marcada como favorita.
 */
export function isFavorite(
  recipeId: string,
  favorites: string[] | Set<string>
): boolean {
  if (!recipeId || !favorites) return false;
  if (favorites instanceof Set) {
    return favorites.has(recipeId);
  }
  return favorites.includes(recipeId);
}
