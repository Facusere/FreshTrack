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
  const tokens = {
    surface: "#fffdf9",
    surfaceSubtle: "#f7f5ef",
    surfaceMuted: "#faf9f5",
    surfaceElevated: "#f3efe7",

    content: "#17372b",
    contentHeading: "#1c332b",
    contentBody: "#2d453b",
    contentMuted: "#415348",

    brand: "#1f493a",
    brandHover: "#16392c",
    brandSubtle: "#e8f1e7",
    brandText: "#1b4334",

    statusOkBg: "#e7f1e9",
    statusOkText: "#24543d",
    statusSoonBg: "#fbf0d2",
    statusSoonText: "#7a4e0a",
    statusExpiredBg: "#f9e5df",
    statusExpiredText: "#8e2d20",

    accentLime: "#d9e982",
    accentLimeFg: "#17372b",

    recipeBg: "#fbf5eb",
    recipeText: "#664614",
    recipeBadgeBg: "#ead7b8",
    recipeBadgeText: "#5a3d12",

    white: "#ffffff",
  };

  it("normal content text must achieve >= 4.5:1 contrast on surface", () => {
    const ratioContent = getContrastRatio(tokens.content, tokens.surface);
    const ratioHeading = getContrastRatio(tokens.contentHeading, tokens.surface);
    const ratioBody = getContrastRatio(tokens.contentBody, tokens.surface);
    const ratioMuted = getContrastRatio(tokens.contentMuted, tokens.surface);

    expect(ratioContent).toBeGreaterThanOrEqual(4.5);
    expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
    expect(ratioBody).toBeGreaterThanOrEqual(4.5);
    expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
  });

  it("normal content text must achieve >= 4.5:1 contrast on surfaceSubtle", () => {
    const ratioContent = getContrastRatio(tokens.content, tokens.surfaceSubtle);
    const ratioHeading = getContrastRatio(tokens.contentHeading, tokens.surfaceSubtle);
    const ratioBody = getContrastRatio(tokens.contentBody, tokens.surfaceSubtle);
    const ratioMuted = getContrastRatio(tokens.contentMuted, tokens.surfaceSubtle);

    expect(ratioContent).toBeGreaterThanOrEqual(4.5);
    expect(ratioHeading).toBeGreaterThanOrEqual(4.5);
    expect(ratioBody).toBeGreaterThanOrEqual(4.5);
    expect(ratioMuted).toBeGreaterThanOrEqual(4.5);
  });

  it("brand buttons with white text must achieve >= 4.5:1 contrast", () => {
    const ratioBrand = getContrastRatio(tokens.white, tokens.brand);
    const ratioBrandHover = getContrastRatio(tokens.white, tokens.brandHover);

    expect(ratioBrand).toBeGreaterThanOrEqual(4.5);
    expect(ratioBrandHover).toBeGreaterThanOrEqual(4.5);
  });

  it("accent lime badge / button must have >= 4.5:1 contrast with accent lime foreground", () => {
    const ratioLime = getContrastRatio(tokens.accentLimeFg, tokens.accentLime);
    expect(ratioLime).toBeGreaterThanOrEqual(4.5);
  });

  it("status badges must achieve >= 4.5:1 contrast on their respective backgrounds", () => {
    const ratioOk = getContrastRatio(tokens.statusOkText, tokens.statusOkBg);
    const ratioSoon = getContrastRatio(tokens.statusSoonText, tokens.statusSoonBg);
    const ratioExpired = getContrastRatio(tokens.statusExpiredText, tokens.statusExpiredBg);

    expect(ratioOk).toBeGreaterThanOrEqual(4.5);
    expect(ratioSoon).toBeGreaterThanOrEqual(4.5);
    expect(ratioExpired).toBeGreaterThanOrEqual(4.5);
  });

  it("recipe section and badges must achieve >= 4.5:1 contrast", () => {
    const ratioRecipeText = getContrastRatio(tokens.recipeText, tokens.recipeBg);
    const ratioBadgeText = getContrastRatio(tokens.recipeBadgeText, tokens.recipeBadgeBg);

    expect(ratioRecipeText).toBeGreaterThanOrEqual(4.5);
    expect(ratioBadgeText).toBeGreaterThanOrEqual(4.5);
  });
});
