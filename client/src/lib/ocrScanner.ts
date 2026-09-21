// In-Browser OCR Scanner with Tesseract.js and Intelligent Receipt & Expiry Parsing
import Tesseract from "tesseract.js";
import { DateLabel, detectDateCandidates } from "./dateRecognition";
import { shelfLifeCatalog } from "./shelfLifeCatalog";
import { formatExpiryDate } from "./shoppingList";

export type ScannedProductResult = {
  id: number;
  name: string;
  category: string;
  expiry: string;
  days: number;
  quantity: string;
  status: "ok" | "soon" | "expired";
  icon: string;
  estimated: boolean;
  dateLabel: DateLabel;
  confidence: number;
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
 * Parses date string (e.g. "18/09/2026", "18/09/26", "18-09-2026") into days from today and display string
 */
export function parseDateCandidateToExpiry(dateStr: string): { days: number; expiry: string } {
  try {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;

      const targetDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      const diffMs = targetDate.getTime() - today.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
      const displayMonth = monthNames[targetDate.getMonth()];
      const currentYear = new Date().getFullYear();
      const expiry =
        targetDate.getFullYear() > currentYear
          ? `${day} ${displayMonth} ${String(targetDate.getFullYear()).slice(2)}`
          : `${day} ${displayMonth}`;

      return { days, expiry };
    }
  } catch {
    // fallback
  }
  return { days: 5, expiry: "5 días" };
}

/**
 * Extracts candidate products and expiry dates from raw OCR text.
 */
export function parseReceiptAndLabelText(
  rawText: string,
  detectIconFn: (name: string, category: string) => string
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

    const normLine = normalize(line);

    // Try finding matching catalog item
    let matchedItem = shelfLifeCatalog.find((item) => {
      const normCatalog = normalize(item.name);
      return normLine.includes(normCatalog) || normCatalog.includes(normLine);
    });

    // Fallback: search individual catalog words (min 4 letters)
    if (!matchedItem) {
      const words = normLine.split(/[\s,.;:-]+/).filter((w) => w.length >= 4);
      for (const word of words) {
        matchedItem = shelfLifeCatalog.find((item) => normalize(item.name).includes(word));
        if (matchedItem) break;
      }
    }

    if (matchedItem && !addedProductNames.has(matchedItem.name)) {
      addedProductNames.add(matchedItem.name);

      // Check if line contains a quantity
      let quantity = "1 unidad";
      const qtyMatch = line.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|lt|litro|litros|u|unid|unidades|paq|pqt|atado)?\b/i);
      if (qtyMatch) {
        const num = qtyMatch[1];
        const unit = qtyMatch[2] ? ` ${qtyMatch[2].toLowerCase()}` : " u";
        quantity = `${num}${unit}`;
      }

      // Check if this line or adjacent lines (+/- 3 lines) has an explicit expiry date
      let lineExpiry = "";
      let lineDays = matchedItem.closedDays;
      let isEstimated = true;
      let dateLabel: DateLabel = "vencimiento";

      // Look for a date candidate nearby that is specifically vencimiento or consumo preferente
      const nearbyExpiry = dateCandidates.find((d) => {
        if (d.label !== "vencimiento" && d.label !== "consumo preferente") return false;
        for (let offset = -3; offset <= 3; offset++) {
          const targetLine = lines[i + offset];
          if (targetLine && targetLine.includes(d.value)) return true;
        }
        return false;
      });

      if (nearbyExpiry) {
        const parsed = parseDateCandidateToExpiry(nearbyExpiry.value);
        lineDays = parsed.days;
        lineExpiry = parsed.expiry;
        isEstimated = false;
        dateLabel = nearbyExpiry.label;
      } else if (explicitExpiry && lines.length <= 12) {
        // Short text or label context (e.g. focused on a container or box)
        const parsed = parseDateCandidateToExpiry(explicitExpiry.value);
        lineDays = parsed.days;
        lineExpiry = parsed.expiry;
        isEstimated = false;
        dateLabel = explicitExpiry.label;
      } else {
        // Supermarket receipt without item expiry: estimate using shelf life catalog
        lineExpiry = formatExpiryDate(matchedItem.closedDays);
        lineDays = matchedItem.closedDays;
        isEstimated = true;
        dateLabel = "vencimiento";
      }

      const status = lineDays < 0 ? "expired" : lineDays <= 3 ? "soon" : "ok";
      const icon = detectIconFn(matchedItem.name, matchedItem.category);

      results.push({
        id: Date.now() + results.length + Math.floor(Math.random() * 1000),
        name: matchedItem.name,
        category: matchedItem.category,
        expiry: lineExpiry,
        days: lineDays,
        quantity,
        status,
        icon,
        estimated: isEstimated,
        dateLabel,
        confidence: isEstimated ? 85 : 95,
      });
    }
  }

  return results;
}

/**
 * Runs Tesseract OCR on an image source (Blob, File, ImageData, HTMLCanvasElement, or data URL string).
 */
export async function performBrowserOCR(
  imageSource: string | HTMLCanvasElement | Blob | File,
  onProgress?: OCRProgressCallback
): Promise<{ text: string; confidence: number }> {
  try {
    const result = await Tesseract.recognize(imageSource, "spa", {
      logger: (m) => {
        if (onProgress && m) {
          const progressVal = typeof m.progress === "number" ? Math.round(m.progress * 100) : 0;
          let friendlyStatus = "Procesando imagen...";
          if (m.status === "loading tesseract core") friendlyStatus = "Cargando motor de reconocimiento...";
          else if (m.status === "initializing tesseract") friendlyStatus = "Inicializando OCR...";
          else if (m.status === "loading language traineddata") friendlyStatus = "Descargando modelo de español...";
          else if (m.status === "recognizing text") friendlyStatus = `Leyendo texto: ${progressVal}%`;

          onProgress({ status: friendlyStatus, progress: progressVal });
        }
      },
    });

    return {
      text: result.data.text || "",
      confidence: result.data.confidence || 0,
    };
  } catch (error) {
    console.error("Tesseract OCR recognition error:", error);
    throw error;
  }
}

/**
 * Built-in realistic sample receipts for instant testing or environments without camera access.
 */
export const SAMPLE_TICKETS = [
  {
    name: "Ticket Supermercado COTO",
    mode: "ticket" as const,
    text: `SUPERMERCADOS COTO S.A.
CUIT: 30-54808315-6
SUCURSAL 104 - BELGRANO
FECHA: 20/09/2026 HORA: 17:42
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
ELAB: 05/09/2026
VENCE: 22/09/2026
CONSUMIR PREFERENTEMENTE ANTES DE: 24/09/2026
MANTENER REFRIGERADO ENTRE 2°C Y 8°C`,
  },
  {
    name: "Ticket Carnicería & Verdulería",
    mode: "ticket" as const,
    text: `GRANJA & VERDULERIA LA HUERTA
TICKET CONSUMIDOR FINAL
FECHA: 20/09/2026
--------------------------------
PECHUGA DE POLLO 2U          $4.500
TOMATE CHERRY 1 BANDEJA      $1.800
BANANA 1KG                   $1.600
MANZANA ROJA 1KG             $1.900
TOTAL                        $9.800
PAGO CON TARJETA DEBITO`,
  },
];
