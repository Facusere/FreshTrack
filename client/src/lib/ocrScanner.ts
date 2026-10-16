// In-Browser OCR Scanner with Tesseract.js and Intelligent Receipt & Expiry Parsing
import Tesseract from "tesseract.js";
import { DateLabel, detectDateCandidates } from "./dateRecognition";
import { shelfLifeCatalog } from "./shelfLifeCatalog";
import { addDaysISO, parseDateCandidateToISO } from "./dates";
import { parseQuantity, formatQuantity } from "./quantity";
export { parseDateCandidateToISO };

export type ScannedProductResult = {
  id: number;
  name: string;
  category: string;
  expiryDate: string; // ISO format (YYYY-MM-DD)
  quantity: string;
  icon: string;
  estimated: boolean;
  dateLabel: DateLabel;
  confidence: number;
  location?: string;
};

export type OCRProgressCallback = (info: { status: string; progress: number }) => void;

const BOILERPLATE_REGEX =
  /(cuit|ticket|factura|total|subtotal|iva|efectivo|vuelto|cambio|tarjeta|cajero|caja|posnet|visa|mastercard|terminal|sucursal|direccion|tel|gracias por su compra|bultos|descuento|afip|fiscal)/i;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * Extracts item quantity and clean product name from a grocery receipt line.
 * Handles multipliers, container sizes, pack units, weight lines, and strips prices and barcodes.
 */
export function extractQuantityFromTicketLine(line: string): {
  quantity: string;
  cleanName: string;
} {
  let working = line.trim();

  // 1. Strip article codes and long barcodes (e.g. ART 12345, COD 4421, 7791234567890)
  working = working.replace(/\b(?:ART|COD|ARTICULO|CÓDIGO|PLU)\.?\s*\d+\b/gi, " ");
  working = working.replace(/\b\d{8,14}\b/g, " ");

  // 2. Strip price indicators:
  // e.g. "x $4.500", "x$4500", "$ 1.250", "$1500,00", "$1200", trailing decimal prices
  working = working.replace(/\bx\s*\$\s*[\d.,]+/gi, " ");
  working = working.replace(/\$\s*[\d.,]+/g, " ");
  working = working.replace(/\s+\d+[.,]\d{2}\s*$/g, " ");

  let multiplier = 1;
  let multiplierFound = false;

  // 3. Check for pack expression like "4X120G" or "4 x 120 g" or "6x500ml"
  const packMatch = working.match(
    /\b(\d+)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|lt|litro|litros|ml|cc)\b/i
  );
  if (packMatch) {
    const packCount = parseInt(packMatch[1], 10);
    const rawAmt = packMatch[2].replace(",", ".");
    const itemQ = parseQuantity(`${rawAmt} ${packMatch[3]}`);
    if (itemQ) {
      const totalAmount = packCount * itemQ.amount;
      const combinedQ = { amount: totalAmount, unit: itemQ.unit, family: itemQ.family };
      const cleanName = working
        .replace(packMatch[0], " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        quantity: formatQuantity(combinedQ),
        cleanName,
      };
    }
  }

  // 4. Check for leading multiplier:
  // e.g. "^2 ", "^3X ", "^4 x "
  const startMultiplierMatch = working.match(/^(\d{1,2})\s*(?:[xX]\s+|\s+)/);
  if (startMultiplierMatch) {
    multiplier = parseInt(startMultiplierMatch[1], 10);
    multiplierFound = true;
    working = working.slice(startMultiplierMatch[0].length).trim();
  }

  // 5. Look for container size / weight / volume in remaining line
  // e.g. "1.500 KG", "1,500 KG", "1KG", "500G", "1L", "750ML", "0,425 kg", "2 unidades"
  const sizeRegex = /\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|lt|litro|litros|ml|cc|paq|pqt|unidades|unidad)\b/i;
  const sizeMatch = working.match(sizeRegex);

  if (sizeMatch) {
    const rawAmt = sizeMatch[1].replace(",", ".");
    const parsedAmt = parseFloat(rawAmt);
    const parsedQ = parseQuantity(`${parsedAmt} ${sizeMatch[2]}`);

    if (parsedQ) {
      working = working.replace(sizeMatch[0], " ");
      const totalAmount = multiplier * parsedQ.amount;
      const combinedQ = {
        amount: totalAmount,
        unit: parsedQ.unit,
        family: parsedQ.family,
      };
      const cleanName = working.replace(/\s+/g, " ").trim();
      return {
        quantity: formatQuantity(combinedQ),
        cleanName,
      };
    }
  }

  // 6. Multiplier only (no size unit found)
  if (multiplierFound) {
    const cleanName = working.replace(/\s+/g, " ").trim();
    return {
      quantity: multiplier === 1 ? "1 unidad" : `${multiplier} unidades`,
      cleanName,
    };
  }

  // 7. Default fallback: 1 unidad
  const cleanName = working.replace(/\s+/g, " ").trim();
  return {
    quantity: "1 unidad",
    cleanName: cleanName || line.trim(),
  };
}

/**
 * Extracts candidate products and expiry dates from raw OCR text.
 */
export function parseReceiptAndLabelText(
  rawText: string,
  detectIconFn: (name: string, category: string) => string,
  today: Date = new Date()
): ScannedProductResult[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const dateCandidates = detectDateCandidates(rawText);
  const explicitExpiry = dateCandidates.find((d) => d.label === "vencimiento" || d.label === "consumo preferente");

  const results: ScannedProductResult[] = [];
  const addedProductNames = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip cashier/tax boilerplate
    if (BOILERPLATE_REGEX.test(line)) continue;

    const { quantity, cleanName } = extractQuantityFromTicketLine(line);
    const normLine = normalize(cleanName || line);

    // Try finding matching catalog item
    let matchedItem = shelfLifeCatalog.find((item) => {
      const normCatalog = normalize(item.name);
      if (normLine.includes(normCatalog) || normCatalog.includes(normLine)) return true;
      return item.aliases?.some((a) => {
        const normA = normalize(a);
        return normLine.includes(normA) || normA.includes(normLine);
      });
    });

    // Fallback: search individual catalog words (min 4 letters)
    if (!matchedItem) {
      const words = normLine.split(/[\s,.;:-]+/).filter((w) => w.length >= 4);
      for (const word of words) {
        matchedItem = shelfLifeCatalog.find((item) => {
          if (normalize(item.name).includes(word)) return true;
          return item.aliases?.some((a) => normalize(a).includes(word));
        });
        if (matchedItem) break;
      }
    }

    if (matchedItem && !addedProductNames.has(matchedItem.name)) {
      addedProductNames.add(matchedItem.name);

      // Check if this line or adjacent lines (+/- 3 lines) has an explicit expiry date
      let expiryDate = "";
      let isEstimated = true;
      let dateLabel: DateLabel = "vencimiento";

      // Look for date candidates nearby (+/- 3 lines)
      const nearbyCandidates = dateCandidates.filter((d) => {
        for (let offset = -3; offset <= 3; offset++) {
          const targetLine = lines[i + offset];
          if (targetLine && targetLine.includes(d.value)) return true;
        }
        return false;
      });

      // Prioritize vencimiento or consumo preferente over elaboración
      const nearbyExpiry =
        nearbyCandidates.find((d) => d.label === "vencimiento" || d.label === "consumo preferente") ||
        nearbyCandidates.find((d) => d.label === "elaboración") ||
        nearbyCandidates[0];

      if (nearbyExpiry && nearbyExpiry.iso) {
        if (nearbyExpiry.label === "elaboración") {
          dateLabel = "elaboración";
          const shelfDays = matchedItem.closedDays || 7;
          expiryDate = addDaysISO(shelfDays, new Date(nearbyExpiry.iso));
          isEstimated = true;
        } else {
          dateLabel = nearbyExpiry.label;
          expiryDate = nearbyExpiry.iso;
          isEstimated = false;
        }
      } else if (explicitExpiry?.iso && lines.length <= 12) {
        if (explicitExpiry.label === "elaboración") {
          dateLabel = "elaboración";
          const shelfDays = matchedItem.closedDays || 7;
          expiryDate = addDaysISO(shelfDays, new Date(explicitExpiry.iso));
          isEstimated = true;
        } else {
          dateLabel = explicitExpiry.label;
          expiryDate = explicitExpiry.iso;
          isEstimated = false;
        }
      }

      // If not parsed from text, fall back to shelf life catalog estimation
      if (!expiryDate) {
        expiryDate = addDaysISO(matchedItem.closedDays, today);
        isEstimated = true;
        dateLabel = "vencimiento";
      }

      const icon = detectIconFn(matchedItem.name, matchedItem.category);

      results.push({
        id: Date.now() + results.length + Math.floor(Math.random() * 1000),
        name: matchedItem.name,
        category: matchedItem.category,
        expiryDate,
        quantity,
        icon,
        estimated: isEstimated,
        dateLabel,
        confidence: isEstimated ? 85 : 95,
      });
    }
  }

  // Fallback: If no catalog products were matched, but candidate text lines and/or dates exist
  if (results.length === 0 && lines.length > 0) {
    const nonBoilerplateLines = lines.filter(
      (l) =>
        !BOILERPLATE_REGEX.test(l) &&
        !dateCandidates.some((d) => l.includes(d.value)) &&
        /[a-zA-ZáéíóúÁÉÍÓÚ]{3,}/.test(l)
    );
    const targetDate = explicitExpiry || dateCandidates[0];
    if (nonBoilerplateLines.length > 0 || targetDate) {
      const rawName = nonBoilerplateLines[0] || "Producto escaneado";
      const { quantity, cleanName } = extractQuantityFromTicketLine(rawName);
      const name = cleanName || rawName;
      const expiryDate = targetDate?.iso || addDaysISO(7, today);
      const isEstimated = !targetDate?.iso;
      const dateLabel: DateLabel = targetDate?.label || "vencimiento";
      const icon = detectIconFn(name, "Almacén seco");

      results.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        category: "Almacén seco",
        expiryDate,
        quantity: quantity || "1 unidad",
        icon,
        estimated: isEstimated,
        dateLabel,
        confidence: isEstimated ? 65 : 90,
      });
    }
  }

  return results;
}

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Converts pixel data to grayscale and applies dynamic contrast stretching
 * to enhance faint or embossed dates on food packaging and receipts.
 */
export function applyGrayscaleAndContrast(
  imageData: { data: Uint8ClampedArray | number[]; width: number; height: number },
  contrastFactor = 1.35
) {
  const { data } = imageData;
  let minLum = 255;
  let maxLum = 0;

  // 1. Convert to grayscale and find min/max luminance
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    if (gray < minLum) minLum = gray;
    if (gray > maxLum) maxLum = gray;
  }

  // 2. Dynamic contrast stretching
  const range = maxLum - minLum;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i];
    let stretched: number;
    if (range > 15) {
      stretched = Math.round(((gray - minLum) / range) * 255);
    } else {
      stretched = Math.round((gray - 128) * contrastFactor + 128);
    }
    const clamped = Math.max(0, Math.min(255, stretched));
    data[i] = clamped;
    data[i + 1] = clamped;
    data[i + 2] = clamped;
  }

  return imageData;
}

/**
 * Preprocesses an image using standard 2D canvas operations:
 * optional bounding box cropping, grayscale conversion, and contrast enhancement.
 */
export async function preprocessImage(
  imageSource: HTMLCanvasElement | HTMLImageElement | ImageData | Blob | File | string,
  cropArea?: CropArea
): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") {
    return imageSource as any;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

  let img: HTMLImageElement | HTMLCanvasElement;
  if (imageSource instanceof HTMLCanvasElement) {
    img = imageSource;
  } else if (typeof Image !== "undefined" && imageSource instanceof Image) {
    img = imageSource;
  } else {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Error al cargar la imagen para preprocesamiento"));
      if (typeof imageSource === "string") {
        el.src = imageSource;
      } else if (typeof URL !== "undefined" && URL.createObjectURL) {
        el.src = URL.createObjectURL(imageSource as Blob);
      } else {
        resolve(el);
      }
    });
  }

  const naturalWidth = (img as HTMLImageElement).naturalWidth || img.width || 640;
  const naturalHeight = (img as HTMLImageElement).naturalHeight || img.height || 480;

  let sx = 0;
  let sy = 0;
  let sw = naturalWidth;
  let sh = naturalHeight;

  if (cropArea) {
    sx = cropArea.x <= 1 ? cropArea.x * naturalWidth : cropArea.x;
    sy = cropArea.y <= 1 ? cropArea.y * naturalHeight : cropArea.y;
    sw = cropArea.width <= 1 ? cropArea.width * naturalWidth : cropArea.width;
    sh = cropArea.height <= 1 ? cropArea.height * naturalHeight : cropArea.height;

    sx = Math.max(0, Math.min(naturalWidth - 1, sx));
    sy = Math.max(0, Math.min(naturalHeight - 1, sy));
    sw = Math.max(1, Math.min(naturalWidth - sx, sw));
    sh = Math.max(1, Math.min(naturalHeight - sy, sh));
  }

  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyGrayscaleAndContrast(imgData);
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn("No se pudo aplicar filtro de escala de grises/contraste:", err);
  }

  return canvas;
}

/**
 * Runs Tesseract OCR on an image source (Blob, File, ImageData, HTMLCanvasElement, or data URL string)
 * using 100% offline local assets from /tesseract/.
 */
export async function performBrowserOCR(
  imageSource: string | HTMLCanvasElement | Blob | File,
  onProgress?: OCRProgressCallback,
  cropArea?: CropArea
): Promise<{ text: string; confidence: number }> {
  let worker: Tesseract.Worker | null = null;
  try {
    // 1. Preprocesamiento opcional en canvas (recorte, escala de grises, contraste)
    let processedSource: any = imageSource;
    if (typeof document !== "undefined") {
      try {
        processedSource = await preprocessImage(imageSource, cropArea);
      } catch (e) {
        console.warn("Fallo en preprocesamiento visual, usando imagen original:", e);
        processedSource = imageSource;
      }
    }

    // 2. Inicializar worker con rutas a assets locales versionados
    onProgress?.({ status: "Iniciando OCR local...", progress: 5 });

    const isBrowser = typeof window !== "undefined";
    const workerOptions: any = isBrowser
      ? {
          workerPath: "/tesseract/worker.min.js",
          corePath: "/tesseract/tesseract-core-lstm.wasm.js",
          langPath: "/tesseract",
        }
      : {};

    workerOptions.logger = (m: any) => {
      if (onProgress && m) {
        const progressVal = typeof m.progress === "number" ? Math.round(m.progress * 100) : 0;
        let friendlyStatus = "Procesando imagen...";
        if (m.status === "loading tesseract core") friendlyStatus = "Cargando motor OCR local...";
        else if (m.status === "initializing tesseract") friendlyStatus = "Inicializando escáner...";
        else if (m.status === "loading language traineddata") friendlyStatus = "Cargando modelo en español...";
        else if (m.status === "recognizing text") friendlyStatus = `Leyendo texto: ${progressVal}%`;

        onProgress({ status: friendlyStatus, progress: progressVal });
      }
    };

    const workerPromise = Tesseract.createWorker("spa", 1, workerOptions);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout al inicializar OCR local")), 15000);
    });

    worker = (await Promise.race([workerPromise, timeoutPromise])) as Tesseract.Worker;

    const result = await worker.recognize(processedSource);

    return {
      text: result.data.text || "",
      confidence: result.data.confidence || 0,
    };
  } catch (error: any) {
    console.error("Tesseract OCR recognition error:", error);
    // B2: Si no hay conexión y los assets locales fallan por algún motivo, mostrar un error claro ("No se pudo inicializar el escáner") en vez de colgarse.
    throw new Error("No se pudo inicializar el escáner");
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignorar error al terminar worker
      }
    }
  }
}

/**
 * Built-in realistic sample receipts for instant testing or environments without camera access.
 */
export function buildSampleTickets(today: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDateDMY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  const todayStr = formatDateDMY(today);
  const elabDate = formatDateDMY(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15));
  const venceDate = formatDateDMY(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2));
  const prefDate = formatDateDMY(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4));

  return [
    {
      name: "Ticket Supermercado COTO",
      mode: "ticket" as const,
      text: `SUPERMERCADOS COTO S.A.
CUIT: 30-54808315-6
SUCURSAL 104 - BELGRANO
FECHA: ${todayStr} HORA: 17:42
--------------------------------
1  LECHE ENTERA 1L          $1.250
1  YOGUR NATURAL            $1.100
2  PAN DE MOLDE             $2.400
1  ESPINACO FRESCA 1 ATADO    $850
1  ARROZ LARGO FINO 1KG     $1.600
--------------------------------
SUBTOTAL                    $7.200
TOTAL                       $7.200
EFECTIVO                   $10.000
VUELTO                      $2.800
GRACIAS POR SU COMPRA`,
    },
    {
      name: "Etiqueta Lácteo / Yogur",
      mode: "label" as const,
      text: `YOGUR NATURAL CON PROBIOTICOS
LOTE: L-4892A
ELAB: ${elabDate}
VENCE: ${venceDate}
CONSUMIR PREFERENTEMENTE ANTES DE: ${prefDate}
MANTENER REFRIGERADO ENTRE 2°C Y 8°C`,
    },
    {
      name: "Ticket Carnicería & Verdulería",
      mode: "ticket" as const,
      text: `GRANJA & VERDULERIA LA HUERTA
TICKET CONSUMIDOR FINAL
FECHA: ${todayStr}
--------------------------------
PECHUGA DE POLLO 2U          $4.500
TOMATE CHERRY 1 BANDEJA      $1.800
BANANA 1KG                   $1.600
MANZANA ROJA 1KG             $1.900
TOTAL                        $9.800
PAGO CON TARJETA DEBITO`,
    },
  ];
}

export const SAMPLE_TICKETS = buildSampleTickets();
