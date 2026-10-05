import { ALL_CATEGORIES, ProductCategory } from "./categories";
import { estimateShelfLife } from "./shelfLifeCatalog";
import { addDaysISO } from "./dates";
import { StoredProduct } from "@/types/product";

export interface ScannedBarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  category: ProductCategory | string;
  quantity: string;
  imageUrl?: string;
  estimatedDays: number;
  expiryDate: string;
  icon: string;
  location: string;
}

export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/**
 * Attempts to detect a barcode from a video or canvas element using the native BarcodeDetector API.
 */
export async function detectBarcodeFromImageSource(
  source: ImageBitmapSource
): Promise<string | null> {
  if (!isBarcodeDetectorSupported()) return null;

  try {
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    const detector = new BarcodeDetectorClass({
      formats: [
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "code_128",
        "qr_code",
      ],
    });

    const barcodes = await detector.detect(source);
    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
      return barcodes[0].rawValue.trim();
    }
  } catch (err) {
    console.warn("Barcode detection error:", err);
  }
  return null;
}

function mapOpenFoodFactsCategory(tags: string[] = [], genericName = ""): ProductCategory {
  const combined = (tags.join(" ") + " " + genericName).toLowerCase();

  if (combined.includes("milk") || combined.includes("lait") || combined.includes("leche") || combined.includes("yogur") || combined.includes("cheese") || combined.includes("fromage") || combined.includes("queso") || combined.includes("dairy")) {
    return "Lácteos";
  }
  if (combined.includes("meat") || combined.includes("viande") || combined.includes("carne") || combined.includes("pollo") || combined.includes("beef") || combined.includes("pork") || combined.includes("charcuterie") || combined.includes("fiambre")) {
    return "Carnes y fiambres";
  }
  if (combined.includes("fish") || combined.includes("poisson") || combined.includes("pescado") || combined.includes("marisco") || combined.includes("tuna") || combined.includes("atun")) {
    return "Pescados y mariscos";
  }
  if (combined.includes("fruit") || combined.includes("apple") || combined.includes("banana") || combined.includes("manzana") || combined.includes("fruta")) {
    return "Frutas";
  }
  if (combined.includes("vegetable") || combined.includes("legume") || combined.includes("verdura") || combined.includes("tomate") || combined.includes("salad")) {
    return "Verduras";
  }
  if (combined.includes("bread") || combined.includes("pain") || combined.includes("pan") || combined.includes("bakery") || combined.includes("pastry") || combined.includes("factura") || combined.includes("galletita")) {
    return "Panadería y pastas";
  }
  if (combined.includes("beverage") || combined.includes("drink") || combined.includes("boisson") || combined.includes("jugo") || combined.includes("juice") || combined.includes("gaseosa") || combined.includes("soda") || combined.includes("agua")) {
    return "Bebidas";
  }
  if (combined.includes("congelado") || combined.includes("frozen") || combined.includes("surgele")) {
    return "Congelados";
  }
  return "Almacén seco";
}

function detectFoodIcon(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes("leche")) return "🥛";
  if (n.includes("queso")) return "🧀";
  if (n.includes("yogur")) return "🥣";
  if (n.includes("arroz")) return "🍚";
  if (n.includes("fideo") || n.includes("pasta")) return "🍝";
  if (n.includes("pan") || n.includes("tostada")) return "🍞";
  if (n.includes("galletita") || n.includes("cookie")) return "🍪";
  if (n.includes("tomate")) return "🍅";
  if (n.includes("huevo")) return "🥚";
  if (n.includes("carne") || n.includes("bife")) return "🥩";
  if (n.includes("pollo")) return "🍗";
  if (n.includes("atun") || n.includes("pescado")) return "🐟";
  if (n.includes("aceite")) return "🫒";
  if (n.includes("cafe")) return "☕";
  if (n.includes("te")) return "🍵";
  if (n.includes("vino") || n.includes("cerveza")) return "🍷";
  if (n.includes("helado")) return "🍦";

  switch (category) {
    case "Lácteos": return "🧀";
    case "Carnes y fiambres": return "🥩";
    case "Pescados y mariscos": return "🐟";
    case "Frutas": return "🍎";
    case "Verduras": return "🥬";
    case "Panadería y pastas": return "🥖";
    case "Congelados": return "🧊";
    case "Bebidas": return "🧃";
    default: return "📦";
  }
}

function inferLocationByCat(category: string): string {
  if (category === "Congelados") return "Freezer";
  if (category === "Lácteos" || category === "Carnes y fiambres" || category === "Pescados y mariscos") return "Heladera";
  if (category === "Verduras" || category === "Frutas") return "Cajón verduras";
  return "Alacena";
}

/**
 * Queries Open Food Facts public API to resolve barcode into full product metadata.
 */
export async function fetchProductByBarcode(
  barcode: string
): Promise<ScannedBarcodeProduct | null> {
  const cleanCode = barcode.trim().replace(/[^0-9]/g, "");
  if (!cleanCode) return null;

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;
    const res = await fetch(url, { headers: { "User-Agent": "FreshTrackApp/1.0 (https://freshtrack.app)" } });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const brand = p.brands ? p.brands.split(",")[0].trim() : undefined;
    const baseName = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || "Producto escaneado";
    const fullName = brand && !baseName.toLowerCase().includes(brand.toLowerCase())
      ? `${baseName} (${brand})`
      : baseName;

    const categoryTags = p.categories_tags || [];
    const category = mapOpenFoodFactsCategory(categoryTags, p.generic_name || "");
    const quantity = p.quantity || "1 unidad";
    const imageUrl = p.image_front_small_url || p.image_front_url || p.image_url;

    const shelfEst = estimateShelfLife(fullName, "cerrado", category);
    const estimatedDays = shelfEst?.days || (category === "Lácteos" ? 14 : category === "Almacén seco" ? 180 : 7);
    const expiryDate = addDaysISO(estimatedDays);
    const icon = detectFoodIcon(fullName, category);
    const location = inferLocationByCat(category);

    return {
      barcode: cleanCode,
      name: fullName,
      brand,
      category,
      quantity,
      imageUrl,
      estimatedDays,
      expiryDate,
      icon,
      location,
    };
  } catch (err) {
    console.warn("Error fetching from OpenFoodFacts:", err);
    return null;
  }
}
