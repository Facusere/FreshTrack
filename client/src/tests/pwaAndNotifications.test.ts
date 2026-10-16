import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { detectUserPlatform, isStandaloneMode } from "../lib/pwaAndNotifications";

describe("pwaAndNotifications - Detección de plataformas multi-SO y Standalone", () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
    (global as any).window = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      navigator: originalNavigator,
    };
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    if (originalWindow !== undefined) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
  });

  it("detecta Android correctamente a través de userAgent", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    });
    expect(detectUserPlatform()).toBe("android");
  });

  it("detecta iOS en iPhone", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    });
    expect(detectUserPlatform()).toBe("ios");
  });

  it("detecta iOS en iPad moderno con MacIntel y touch points", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      },
      configurable: true,
      writable: true,
    });
    expect(detectUserPlatform()).toBe("ios");
  });

  it("detecta Windows a través de platform Win32 / userAgent", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        platform: "Win32",
        maxTouchPoints: 0,
      },
      configurable: true,
      writable: true,
    });
    expect(detectUserPlatform()).toBe("windows");
  });

  it("detecta Linux a través de platform Linux / userAgent", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
        platform: "Linux x86_64",
        maxTouchPoints: 0,
      },
      configurable: true,
      writable: true,
    });
    expect(detectUserPlatform()).toBe("linux");
  });

  it("detecta macOS en desktop sin touch points", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        platform: "MacIntel",
        maxTouchPoints: 0,
      },
      configurable: true,
      writable: true,
    });
    expect(detectUserPlatform()).toBe("macos");
  });

  it("evalúa isStandaloneMode correctamente cuando display-mode es standalone", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isStandaloneMode()).toBe(true);
  });
});
