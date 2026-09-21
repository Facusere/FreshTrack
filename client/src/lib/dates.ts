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
 * Parses dd/mm/aa, dd/mm/aaaa, dd-mm-aa, dd-mm-aaaa into YYYY-MM-DD.
 * 2-digit years convert to 20xx.
 * Returns null if the date does not exist in the calendar (e.g. 31/02).
 */
export function parseDateCandidateToISO(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2}|\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  if (year < 100) {
    year += 2000;
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  return toISODate(d);
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
