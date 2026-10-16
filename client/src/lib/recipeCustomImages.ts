import { loadJSON, saveJSON } from "./storage";

export const CUSTOM_RECIPE_PHOTOS_STORAGE_KEY = "freshtrack-custom-recipe-photos-v1";
export const RECIPE_PHOTO_CHANGED_EVENT = "freshtrack:recipe-photo-changed";

export type CustomRecipePhotosMap = Record<string, string>;

/**
 * Loads all user-uploaded custom recipe photos from localStorage.
 */
export function loadCustomRecipePhotos(): CustomRecipePhotosMap {
  return loadJSON<CustomRecipePhotosMap>(CUSTOM_RECIPE_PHOTOS_STORAGE_KEY, {});
}

/**
 * Returns the custom photo for a given recipe ID if one has been set.
 */
export function getRecipeCustomPhoto(recipeId: string): string | undefined {
  const photos = loadCustomRecipePhotos();
  return photos[recipeId];
}

/**
 * Checks if a recipe has a custom user-uploaded photo.
 */
export function hasCustomRecipePhoto(recipeId: string): boolean {
  return Boolean(getRecipeCustomPhoto(recipeId));
}

/**
 * Saves or updates a custom user photo for a specific recipe.
 * Dispatches an event so all mounted components update immediately.
 */
export function saveCustomRecipePhoto(recipeId: string, photoDataUrl: string): void {
  const photos = loadCustomRecipePhotos();
  photos[recipeId] = photoDataUrl;
  saveJSON(CUSTOM_RECIPE_PHOTOS_STORAGE_KEY, photos);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(RECIPE_PHOTO_CHANGED_EVENT, {
        detail: { recipeId, photoDataUrl },
      })
    );
  }
}

/**
 * Removes the custom user photo for a recipe, restoring the default cover.
 */
export function removeCustomRecipePhoto(recipeId: string): void {
  const photos = loadCustomRecipePhotos();
  if (recipeId in photos) {
    delete photos[recipeId];
    saveJSON(CUSTOM_RECIPE_PHOTOS_STORAGE_KEY, photos);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(RECIPE_PHOTO_CHANGED_EVENT, {
          detail: { recipeId, photoDataUrl: null },
        })
      );
    }
  }
}

/**
 * Compresses an image File or Data URL to fit nicely within localStorage quota.
 * Resizes max dimension to 1000px and saves as optimized JPEG (~60-120KB).
 */
export async function compressRecipeImage(
  input: File | Blob | string,
  maxDimension = 1000,
  quality = 0.82
): Promise<string> {
  if (typeof document === "undefined") {
    return typeof input === "string" ? input : "";
  }

  const dataUrl =
    typeof input === "string"
      ? input
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
          reader.readAsDataURL(input);
        });

  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => reject(new Error("Error al cargar la imagen para optimizar"));
    img.src = dataUrl;
  });
}
