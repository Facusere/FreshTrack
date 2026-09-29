import { describe, expect, it } from "vitest";

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("WCAG 2.1 AA Contrast Auditing for Semantic Design Tokens", () => {
  const lightTokens = {
    surface: "#ffffff",
    surfaceSubtle: "#f8f9f8",
    surfaceMuted: "#f1f4f2",
    surfaceElevated: "#ffffff",

    content: "#141a16",
    contentHeading: "#111613",
    contentBody: "#2c3530",
    contentMuted: "#526057",

    brand: "#1f493a",
    brandHover: "#173b2e",
    brandSubtle: "#edf4ef",
    brandText: "#1a4234",

    statusOkBg: "#edf4ef",
    statusOkText: "#1a4234",
    statusSoonBg: "#fdf8ed",
    statusSoonText: "#7a4d0c",
    statusExpiredBg: "#fdf2f0",
    statusExpiredText: "#8e2b20",

    accentLime: "#bfe3c0",
    accentLimeFg: "#122a1e",

    recipeBg: "#faf6f0",
    recipeText: "#6b4b1a",
    recipeBadgeBg: "#f1e4d1",
    recipeBadgeText: "#593c12",

    white: "#ffffff",
  };

  const darkTokens = {
    background: "#121614",
    surface: "#1a201d",
    surfaceSubtle: "#151a17",
    surfaceMuted: "#212824",
    surfaceElevated: "#26302b",

    content: "#f2f6f3",
    contentHeading: "#fafcfb",
    contentBody: "#d4ded6",
    contentMuted: "#9cb0a2",

    brand: "#78b387",
    brandHover: "#8dc29a",
    brandSubtle: "#202c24",
    brandText: "#9ed4ac",

    statusOkBg: "#1c2820",
    statusOkText: "#a3dab0",
    statusSoonBg: "#2b2416",
    statusSoonText: "#f5cf7d",
    statusExpiredBg: "#2e1b19",
    statusExpiredText: "#f59c90",

    accentLime: "#72a97f",
    accentLimeFg: "#0e1610",

    recipeBg: "#262016",
    recipeText: "#eed297",
    recipeBadgeBg: "#3b301f",
    recipeBadgeText: "#f7dfab",
  };

  describe("Light Mode Tokens", () => {
    it("normal content text must achieve >= 4.5:1 contrast on surface", () => {
      const ratioContent = getContrastRatio(lightTokens.content, lightTokens.surface);
      const ratioHeading = getContrastRatio(lightTokens.contentHeading, lightTokens.surface);
      const ratioBody = getContrastRatio(lightTokens.contentBody, lightTokens.surface);
      const ratioMuted = getContrastRatio(lightTokens.contentMuted, lightTokens.surface);

      expect(ratioContent).toBeGreaterThanOrEqual(4.5);
      expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
      expect(ratioBody).toBeGreaterThanOrEqual(4.5);
      expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
    });

    it("normal content text must achieve >= 4.5:1 contrast on surfaceSubtle", () => {
      const ratioContent = getContrastRatio(lightTokens.content, lightTokens.surfaceSubtle);
      const ratioHeading = getContrastRatio(lightTokens.contentHeading, lightTokens.surfaceSubtle);
      const ratioBody = getContrastRatio(lightTokens.contentBody, lightTokens.surfaceSubtle);
      const ratioMuted = getContrastRatio(lightTokens.contentMuted, lightTokens.surfaceSubtle);

      expect(ratioContent).toBeGreaterThanOrEqual(4.5);
      expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
      expect(ratioBody).toBeGreaterThanOrEqual(4.5);
      expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
    });

    it("brand buttons with white text must achieve >= 4.5:1 contrast", () => {
      const ratioBrand = getContrastRatio(lightTokens.white, lightTokens.brand);
      const ratioBrandHover = getContrastRatio(lightTokens.white, lightTokens.brandHover);

      expect(ratioBrand).toBeGreaterThanOrEqual(4.5);
      expect(ratioBrandHover).toBeGreaterThanOrEqual(4.5);
    });

    it("accent lime badge / button must have >= 4.5:1 contrast with accent lime foreground", () => {
      const ratioLime = getContrastRatio(lightTokens.accentLimeFg, lightTokens.accentLime);
      expect(ratioLime).toBeGreaterThanOrEqual(4.5);
    });

    it("status badges must achieve >= 4.5:1 contrast on their respective backgrounds", () => {
      const ratioOk = getContrastRatio(lightTokens.statusOkText, lightTokens.statusOkBg);
      const ratioSoon = getContrastRatio(lightTokens.statusSoonText, lightTokens.statusSoonBg);
      const ratioExpired = getContrastRatio(lightTokens.statusExpiredText, lightTokens.statusExpiredBg);

      expect(ratioOk).toBeGreaterThanOrEqual(4.5);
      expect(ratioSoon).toBeGreaterThanOrEqual(4.5);
      expect(ratioExpired).toBeGreaterThanOrEqual(4.5);
    });

    it("recipe section and badges must achieve >= 4.5:1 contrast", () => {
      const ratioRecipeText = getContrastRatio(lightTokens.recipeText, lightTokens.recipeBg);
      const ratioBadgeText = getContrastRatio(lightTokens.recipeBadgeText, lightTokens.recipeBadgeBg);

      expect(ratioRecipeText).toBeGreaterThanOrEqual(4.5);
      expect(ratioBadgeText).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Dark Mode Tokens", () => {
    it("normal content text must achieve >= 4.5:1 contrast on dark surface", () => {
      const ratioContent = getContrastRatio(darkTokens.content, darkTokens.surface);
      const ratioHeading = getContrastRatio(darkTokens.contentHeading, darkTokens.surface);
      const ratioBody = getContrastRatio(darkTokens.contentBody, darkTokens.surface);
      const ratioMuted = getContrastRatio(darkTokens.contentMuted, darkTokens.surface);

      expect(ratioContent).toBeGreaterThanOrEqual(4.5);
      expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
      expect(ratioBody).toBeGreaterThanOrEqual(4.5);
      expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
    });

    it("normal content text must achieve >= 4.5:1 contrast on dark background", () => {
      const ratioContent = getContrastRatio(darkTokens.content, darkTokens.background);
      const ratioHeading = getContrastRatio(darkTokens.contentHeading, darkTokens.background);
      const ratioBody = getContrastRatio(darkTokens.contentBody, darkTokens.background);
      const ratioMuted = getContrastRatio(darkTokens.contentMuted, darkTokens.background);

      expect(ratioContent).toBeGreaterThanOrEqual(4.5);
      expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
      expect(ratioBody).toBeGreaterThanOrEqual(4.5);
      expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
    });

    it("dark accent lime button must have >= 4.5:1 contrast with accent lime foreground", () => {
      const ratioLime = getContrastRatio(darkTokens.accentLimeFg, darkTokens.accentLime);
      expect(ratioLime).toBeGreaterThanOrEqual(4.5);
    });

    it("dark status badges must achieve >= 4.5:1 contrast on their respective backgrounds", () => {
      const ratioOk = getContrastRatio(darkTokens.statusOkText, darkTokens.statusOkBg);
      const ratioSoon = getContrastRatio(darkTokens.statusSoonText, darkTokens.statusSoonBg);
      const ratioExpired = getContrastRatio(darkTokens.statusExpiredText, darkTokens.statusExpiredBg);

      expect(ratioOk).toBeGreaterThanOrEqual(4.5);
      expect(ratioSoon).toBeGreaterThanOrEqual(4.5);
      expect(ratioExpired).toBeGreaterThanOrEqual(4.5);
    });

    it("dark recipe section and badges must achieve >= 4.5:1 contrast", () => {
      const ratioRecipeText = getContrastRatio(darkTokens.recipeText, darkTokens.recipeBg);
      const ratioBadgeText = getContrastRatio(darkTokens.recipeBadgeText, darkTokens.recipeBadgeBg);

      expect(ratioRecipeText).toBeGreaterThanOrEqual(4.5);
      expect(ratioBadgeText).toBeGreaterThanOrEqual(4.5);
    });
  });
});
