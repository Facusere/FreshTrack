import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CUSTOM_RECIPE_PHOTOS_STORAGE_KEY,
  RECIPE_PHOTO_CHANGED_EVENT,
  getRecipeCustomPhoto,
  hasCustomRecipePhoto,
  loadCustomRecipePhotos,
  removeCustomRecipePhoto,
  saveCustomRecipePhoto,
} from "../lib/recipeCustomImages";

describe("recipeCustomImages - Gestión de fotos personalizadas de recetas", () => {
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

    // Polyfill window & CustomEvent in node environment for event testing
    (globalThis as any).CustomEvent = class CustomEvent {
      detail: any;
      constructor(public type: string, init?: { detail?: any }) {
        this.detail = init?.detail;
      }
    };
    (globalThis as any).window = {
      dispatchEvent: vi.fn(),
    };

    vi.restoreAllMocks();
  });

  it("retorna un mapa vacío por defecto cuando no hay fotos guardadas", () => {
    const photos = loadCustomRecipePhotos();
    expect(photos).toEqual({});
    expect(hasCustomRecipePhoto("receta-1")).toBe(false);
    expect(getRecipeCustomPhoto("receta-1")).toBeUndefined();
  });

  it("guarda una foto personalizada, la persiste en localStorage y emite el evento", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const mockPhotoData = "data:image/jpeg;base64,mockImageData123";

    saveCustomRecipePhoto("empanadas-carne", mockPhotoData);

    // Verificación en localStorage
    expect(store[CUSTOM_RECIPE_PHOTOS_STORAGE_KEY]).toContain("data:image/jpeg;base64,mockImageData123");

    // Verificación con getters
    expect(hasCustomRecipePhoto("empanadas-carne")).toBe(true);
    expect(getRecipeCustomPhoto("empanadas-carne")).toBe(mockPhotoData);

    // Verificación de evento CustomEvent emitido
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(RECIPE_PHOTO_CHANGED_EVENT);
    expect(event.detail).toEqual({
      recipeId: "empanadas-carne",
      photoDataUrl: mockPhotoData,
    });
  });

  it("permite actualizar la foto de una receta existente", () => {
    saveCustomRecipePhoto("guiso-lentejas", "data:image/jpeg;base64,foto1");
    expect(getRecipeCustomPhoto("guiso-lentejas")).toBe("data:image/jpeg;base64,foto1");

    saveCustomRecipePhoto("guiso-lentejas", "data:image/jpeg;base64,foto2");
    expect(getRecipeCustomPhoto("guiso-lentejas")).toBe("data:image/jpeg;base64,foto2");
  });

  it("elimina la foto personalizada y notifica el evento de restauración", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    saveCustomRecipePhoto("pastel-papa", "data:image/jpeg;base64,recuerdo");

    expect(hasCustomRecipePhoto("pastel-papa")).toBe(true);

    removeCustomRecipePhoto("pastel-papa");

    expect(hasCustomRecipePhoto("pastel-papa")).toBe(false);
    expect(getRecipeCustomPhoto("pastel-papa")).toBeUndefined();

    // Verificamos que se despachó el evento con photoDataUrl: null
    const lastEvent = dispatchSpy.mock.calls[dispatchSpy.mock.calls.length - 1][0] as CustomEvent;
    expect(lastEvent.type).toBe(RECIPE_PHOTO_CHANGED_EVENT);
    expect(lastEvent.detail).toEqual({
      recipeId: "pastel-papa",
      photoDataUrl: null,
    });
  });

  it("tolera llamar a removeCustomRecipePhoto con un id inexistente sin fallar", () => {
    expect(() => removeCustomRecipePhoto("inexistente")).not.toThrow();
  });
});
