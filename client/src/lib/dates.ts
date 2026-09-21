import { useEffect, useState } from "react";

export const SOON_THRESHOLD_DAYS = 3;

/**
 * Returns YYYY-MM-DD using LOCAL date components (not UTC, which changes day at 21:00 in Argentina).
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(today: Date = new Date()): string {
  return toISODate(today);
}

/**
 * Adds or subtracts days from a given date and returns YYYY-MM-DD.
 * No clamping: if days is 0 or negative, returns that calculated date.
 */
export function addDaysISO(days: number, today: Date = new Date()): string {
  const result = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  return toISODate(result);
}

/**
 * Calculates calendar day difference between local midnights of today and the ISO date.
 */
export function daysUntil(iso: string, today: Date = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = target.getTime() - current.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function statusFromDays(days: number): "ok" | "soon" | "expired" {
  if (days < 0) return "expired";
  if (days <= SOON_THRESHOLD_DAYS) return "soon";
  return "ok";
}

/**
 * Formats an ISO date into human-readable string: "18 sep", and "12 ago 27" if year differs from today.
 */
export function formatExpiryDisplay(iso: string, today: Date = new Date()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const monthStr = months[m - 1] || "";
  const targetYear = y;
  const currentYear = today.getFullYear();

  if (targetYear !== currentYear) {
    const shortYear = String(targetYear).slice(-2);
    return `${d} ${monthStr} ${shortYear}`;
  }
  return `${d} ${monthStr}`;
}

/**
 * Relative days text: "hoy", "mañana", "en N días", "hace 1 día", "hace N días".
 */
export function formatRelativeDays(days: number): string {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days > 1) return `en ${days} días`;
  if (days === -1) return "hace 1 día";
  return `hace ${Math.abs(days)} días`;
}

/**
 * Formats an ISO date/timestamp into a relative time string in Rioplatense Spanish.
 * e.g. "recién", "hace 5 minutos", "hace 2 horas", "ayer", "hace 3 días".
 */
export function formatTimeAgo(isoString: string, now: Date = new Date()): string {
  const d = new Date(isoString);
  const diffMs = now.getTime() - d.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "recién";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "recién";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "hace 1 minuto";
  if (diffMin < 60) return `hace ${diffMin} minutos`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return "hace 1 hora";
  if (diffHours < 24) return `hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;

  return formatExpiryDisplay(toISODate(d), now);
}

export type DateLabel = "elaboración" | "vencimiento" | "consumo preferente" | "desconocida";

export type DateParseResult = {
  value: string;
  iso: string;
  precision: "day" | "month";
  label: DateLabel;
  score: number;
};

const MONTH_MAP: Record<string, number> = {
  // Spanish
  ene: 1,
  enero: 1,
  feb: 2,
  febrero: 2,
  mar: 3,
  marzo: 3,
  abr: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  jul: 7,
  julio: 7,
  ago: 8,
  agosto: 8,
  sep: 9,
  set: 9,
  sept: 9,
  septiembre: 9,
  setiembre: 9,
  oct: 10,
  octubre: 10,
  nov: 11,
  noviembre: 11,
  dic: 12,
  diciembre: 12,

  // English
  jan: 1,
  january: 1,
  apr: 4,
  april: 4,
  aug: 8,
  august: 8,
  dec: 12,
  december: 12,
};

function cleanOcrDigits(str: string): string {
  return str
    .replace(/[Oo]/g, "0")
    .replace(/[lI]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/B/g, "8");
}

function resolveYear(str: string): number | null {
  const cleaned = cleanOcrDigits(str);
  if (!/^\d+$/.test(cleaned)) return null;
  let y = parseInt(cleaned, 10);
  if (y >= 0 && y <= 50) {
    y += 2000;
  }
  // Sanity check: years between 2000 and 2040
  if (y < 2000 || y > 2040) {
    return null;
  }
  return y;
}

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function resolveMonth(str: string): number | null {
  const cleaned = cleanOcrDigits(str);
  if (/^\d+$/.test(cleaned)) {
    const m = parseInt(cleaned, 10);
    return m >= 1 && m <= 12 ? m : null;
  }
  const norm = str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return MONTH_MAP[norm] || null;
}

function resolveDay(str: string, year: number, month: number): number | null {
  const cleaned = cleanOcrDigits(str);
  if (!/^\d+$/.test(cleaned)) return null;
  const d = parseInt(cleaned, 10);
  const maxDay = getLastDayOfMonth(year, month);
  return d >= 1 && d <= maxDay ? d : null;
}

function extractDateLabel(text: string): DateLabel {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    /\b(?:vto|venc|vence|vencimiento|val|validez|exp|expiry|bb|consumir preferentemente|consumo antes|best before|use by|caducidad)\b/i.test(
      norm
    )
  ) {
    return "vencimiento";
  }
  if (
    /\b(?:elab|elaboracion|elaborado|fabricacion|fabricado|fab|env|envasado|pack|mfg|fecha de elaboracion|producido)\b/i.test(
      norm
    )
  ) {
    return "elaboración";
  }
  return "desconocida";
}

/**
 * Parses dates from OCR text into ISO (YYYY-MM-DD) format.
 * Supports:
 * - Numeric dd/mm/aaaa, dd/mm/aa, dd-mm-aa, dd.mm.aa, dd mm aa
 * - Text months in ES/EN: 12 AGO 2027, 12-AGO-27, 12 de agosto de 2027, 12 Aug 2027
 * - Glued dates: 12AGO27, 12AGO2027
 * - Month-Year: mm/aaaa, mm/aa, MMM aaaa, MMM aa, AGO 2027, AGO/27 (defaults to last day of month)
 * - OCR noise repair: O/o->0, l/I->1, S->5, B->8
 * - Sanity checks: years 2000..2040, valid day in month (rejects 31/02), 2-digit years > 50 rejected
 */
export function parseDateToISO(
  text: string,
  _referenceDate?: Date
): DateParseResult | null {
  if (!text || typeof text !== "string") return null;

  const label = extractDateLabel(text);
  const score =
    label === "vencimiento"
      ? 10
      : label === "consumo preferente"
      ? 8
      : label === "elaboración"
      ? 4
      : 5;

  // 1) dd de MMMM de aaaa / dd de MMMM del aaaa
  const deMatch = text.match(
    /(?:^|[^\w])(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)\s+(?:de|del)\s+([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (deMatch) {
    const year = resolveYear(deMatch[3]);
    const month = resolveMonth(deMatch[2]);
    if (year && month) {
      const day = resolveDay(deMatch[1], year, month);
      if (day) {
        return {
          value: deMatch[0].trim(),
          iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          precision: "day",
          label,
          score,
        };
      }
    }
  }

  // 2) dd MMM aaaa / dd-MMM-aa / dd.MMM.aa / dd/MMM/aa
  const mmmMatch = text.match(
    /(?:^|[^\w])([0-9OolISB]{1,2})[\s\/\.\-]+([a-zA-ZáéíóúÁÉÍÓÚ]{3,10})[\s\/\.\-]+([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (mmmMatch) {
    const year = resolveYear(mmmMatch[3]);
    const month = resolveMonth(mmmMatch[2]);
    if (year && month) {
      const day = resolveDay(mmmMatch[1], year, month);
      if (day) {
        return {
          value: mmmMatch[0].trim(),
          iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          precision: "day",
          label,
          score,
        };
      }
    }
  }

  // 3) Glued ddMMMyy / ddMMMyyyy (e.g. 12AGO27, 12AGO2027)
  const gluedMatch = text.match(
    /(?:^|[^\w])([0-9OolISB]{1,2})([a-zA-Z]{3,4})([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (gluedMatch) {
    const year = resolveYear(gluedMatch[3]);
    const month = resolveMonth(gluedMatch[2]);
    if (year && month) {
      const day = resolveDay(gluedMatch[1], year, month);
      if (day) {
        return {
          value: gluedMatch[0].trim(),
          iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          precision: "day",
          label,
          score,
        };
      }
    }
  }

  // 4) Numeric full date: dd/mm/aaaa, dd/mm/aa, dd-mm-aa, dd.mm.aa, dd mm aa
  const numMatch = text.match(
    /(?:^|[^\w])([0-9OolISB]{1,2})\s*[\/\.\-\s]\s*([0-9OolISB]{1,2})\s*[\/\.\-\s]\s*([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (numMatch) {
    const year = resolveYear(numMatch[3]);
    const month = resolveMonth(numMatch[2]);
    if (year && month) {
      const day = resolveDay(numMatch[1], year, month);
      if (day) {
        return {
          value: numMatch[0].trim(),
          iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          precision: "day",
          label,
          score,
        };
      }
    }
  }

  // 5) Month-Year with month name: MMM aaaa, MMM aa, MMM/aa, MMM-aa
  const mmmYearMatch = text.match(
    /(?:^|[^\w])([a-zA-ZáéíóúÁÉÍÓÚ]{3,10})\s*[\/\.\-\s]\s*([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (mmmYearMatch) {
    const year = resolveYear(mmmYearMatch[2]);
    const month = resolveMonth(mmmYearMatch[1]);
    if (year && month) {
      const lastDay = getLastDayOfMonth(year, month);
      return {
        value: mmmYearMatch[0].trim(),
        iso: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        precision: "month",
        label,
        score,
      };
    }
  }

  // 6) Glued Month-Year: AGO27, AGO2027
  const gluedMmmYearMatch = text.match(
    /(?:^|[^\w])([a-zA-Z]{3,4})([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (gluedMmmYearMatch) {
    const year = resolveYear(gluedMmmYearMatch[2]);
    const month = resolveMonth(gluedMmmYearMatch[1]);
    if (year && month) {
      const lastDay = getLastDayOfMonth(year, month);
      return {
        value: gluedMmmYearMatch[0].trim(),
        iso: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        precision: "month",
        label,
        score,
      };
    }
  }

  // 7) Numeric Month-Year: mm/aaaa, mm/aa, mm-aaaa, mm-aa, mm.aaaa, mm.aa
  const numMonthYearMatch = text.match(
    /(?:^|[^\w])([0-9OolISB]{1,2})\s*[\/\.\-]\s*([0-9OolISB]{2,4})(?:[^\w]|$)/i
  );
  if (numMonthYearMatch) {
    const year = resolveYear(numMonthYearMatch[2]);
    const month = resolveMonth(numMonthYearMatch[1]);
    if (year && month) {
      const lastDay = getLastDayOfMonth(year, month);
      return {
        value: numMonthYearMatch[0].trim(),
        iso: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        precision: "month",
        label,
        score,
      };
    }
  }

  return null;
}

/**
 * Backward-compatible helper returning just ISO string YYYY-MM-DD or null.
 */
export function parseDateCandidateToISO(text: string): string | null {
  const res = parseDateToISO(text);
  return res ? res.iso : null;
}

/**
 * React hook returning today's Date and updating at midnight and on visibility change.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const update = () => setToday(new Date());

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        update();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    let timeoutId: number;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const msUntilMidnight = tomorrow.getTime() - now.getTime() + 100;
      timeoutId = window.setTimeout(() => {
        update();
        scheduleNextMidnight();
      }, msUntilMidnight);
    };

    scheduleNextMidnight();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, []);

  return today;
}
