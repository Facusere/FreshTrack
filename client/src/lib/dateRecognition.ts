import { parseDateToISO, DateLabel, DateParseResult } from "./dates.js";
export { parseDateToISO };
export type { DateLabel, DateParseResult };

export type DateCandidate = {
  value: string;
  iso?: string;
  precision?: "day" | "month";
  rawContext: string;
  label: DateLabel;
  score: number;
};

export type DateLearningRule = {
  productKey: string;
  category?: string;
  preferredLabel?: DateLabel;
  shelfLifeDays?: number;
  corrections: number;
  updatedAt: string;
};

const STORAGE_KEY = "freshtrack-date-learning-v1";

const labelKeywords: Record<Exclude<DateLabel, "desconocida">, string[]> = {
  vencimiento: ["vence", "vencimiento", "vto", "vto.", "exp", "exp.", "expiry", "use by", "caducidad", "fecha limite", "fecha límite"],
  elaboración: ["elab", "elaboración", "elaboracion", "fabricación", "fabricacion", "fab", "mfg", "manufacture", "producido"],
  "consumo preferente": ["consumir preferentemente antes de", "consumo preferente", "consumir antes de", "preferentemente", "best before", "best by", "bb"],
};

const negativeKeywords: Record<Exclude<DateLabel, "desconocida">, string[]> = {
  vencimiento: ["elab", "elaboración", "elaboracion", "fab", "mfg", "consumir preferentemente", "best before"],
  elaboración: ["vence", "vencimiento", "vto", "exp", "consumir preferentemente", "best before"],
  "consumo preferente": ["vence", "vencimiento", "vto", "exp", "elab", "elaboración", "fabricación"],
};

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export function classifyDateContext(context: string, learning?: DateLearningRule): DateLabel {
  const normalized = normalize(context);
  const scores: Record<DateLabel, number> = { vencimiento: 0, elaboración: 0, "consumo preferente": 0, desconocida: 0 };
  (Object.keys(labelKeywords) as Array<Exclude<DateLabel, "desconocida">>).forEach((label) => {
    labelKeywords[label].forEach((keyword) => {
      const normalizedKeyword = normalize(keyword);
      const keywordIndex = normalized.indexOf(normalizedKeyword);
      if (keywordIndex >= 0) {
        const distanceFromCenter = Math.abs((keywordIndex + normalizedKeyword.length / 2) - normalized.length / 2);
        scores[label] += (keyword.length >= 8 ? 5 : 3) + Math.max(0, 6 - distanceFromCenter / 8);
      }
    });
    negativeKeywords[label].forEach((keyword) => { if (normalized.includes(normalize(keyword))) scores[label] -= keyword.length >= 8 ? 4 : 2; });
  });
  if (learning?.preferredLabel) scores[learning.preferredLabel] += 4 + Math.min(learning.corrections, 4);
  const winner = (Object.entries(scores) as Array<[DateLabel, number]>).sort((a, b) => b[1] - a[1])[0];
  return winner[1] > 0 ? winner[0] : "desconocida";
}

export function detectDateCandidates(ocrText: string, learning?: DateLearningRule): DateCandidate[] {
  const lines = ocrText.split(/\r?\n/).filter(Boolean);
  const candidates: DateCandidate[] = [];

  for (const line of lines) {
    const parsed = parseDateToISO(line);
    if (parsed) {
      const label =
        learning?.preferredLabel && learning.corrections > 0
          ? learning.preferredLabel
          : parsed.label !== "desconocida"
          ? parsed.label
          : classifyDateContext(line, learning);

      candidates.push({
        value: parsed.value,
        iso: parsed.iso,
        precision: parsed.precision,
        rawContext: line,
        label,
        score:
          label === "vencimiento"
            ? 10
            : label === "consumo preferente"
            ? 8
            : label === "elaboración"
            ? 4
            : parsed.score,
      });
    }
  }

  return candidates;
}

export function loadLearningRules(): DateLearningRule[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as DateLearningRule[]; } catch { return []; }
}

export function saveLearningCorrection(input: Omit<DateLearningRule, "corrections" | "updatedAt">) {
  const rules = loadLearningRules();
  const key = normalize(input.productKey);
  const index = rules.findIndex((rule) => normalize(rule.productKey) === key);
  const next: DateLearningRule = index >= 0 ? { ...rules[index], ...input, corrections: rules[index].corrections + 1, updatedAt: new Date().toISOString() } : { ...input, corrections: 1, updatedAt: new Date().toISOString() };
  if (index >= 0) rules[index] = next; else rules.push(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  return next;
}

export function getLearningRule(productKey: string, category?: string) {
  const normalizedKey = normalize(productKey);
  return loadLearningRules().find((rule) => normalize(rule.productKey) === normalizedKey || (category && normalize(rule.category || "") === normalize(category))) || undefined;
}

export function labelForDisplay(label: DateLabel) {
  if (label === "vencimiento") return "Fecha de vencimiento";
  if (label === "elaboración") return "Fecha de elaboración";
  if (label === "consumo preferente") return "Consumir preferentemente antes de";
  return "Fecha detectada";
}
