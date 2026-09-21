import type { Request, Response } from "express";

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const ipRateLimits = new Map<string, RateLimitEntry>();
const translationCache = new Map<string, { translatedText: string; expiresAt: number }>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_MAX = 30; // 30 requests / min
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);

  if (!entry || now > entry.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function performTranslation(
  texts: string[],
  targetLang = "ES",
  apiKey = process.env.DEEPL_API_KEY
): Promise<{ translated: boolean; texts: string[]; reason?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { translated: false, texts, reason: "missing_api_key" };
  }

  if (!texts || texts.length === 0) {
    return { translated: true, texts: [] };
  }

  const now = Date.now();
  const results: string[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || !text.trim()) {
      results[i] = text;
      continue;
    }
    const cacheKey = `${targetLang}:${text}`;
    const cached = translationCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      results[i] = cached.translatedText;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
    }
  }

  if (uncachedTexts.length === 0) {
    return { translated: true, texts: results };
  }

  // DeepL endpoint: Free keys end in :fx and use api-free.deepl.com
  const endpoint = apiKey.trim().endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: uncachedTexts,
        target_lang: targetLang.toUpperCase(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`DeepL translation failed with status ${response.status}`);
      return { translated: false, texts, reason: `deepl_status_${response.status}` };
    }

    const data = (await response.json()) as {
      translations?: Array<{ text: string }>;
    };

    if (!data.translations || data.translations.length !== uncachedTexts.length) {
      return { translated: false, texts, reason: "invalid_response" };
    }

    for (let j = 0; j < uncachedTexts.length; j++) {
      const origIdx = uncachedIndices[j];
      const translated = data.translations[j].text;
      results[origIdx] = translated;

      const cacheKey = `${targetLang}:${uncachedTexts[j]}`;
      translationCache.set(cacheKey, {
        translatedText: translated,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    return { translated: true, texts: results };
  } catch (err: unknown) {
    console.warn("DeepL translation error:", err);
    return { translated: false, texts, reason: "network_or_timeout" };
  }
}

export async function handleTranslateRequest(req: Request, res: Response) {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";

  if (isRateLimited(ip)) {
    return res.status(429).json({
      translated: false,
      texts: req.body?.texts || [],
      reason: "rate_limit_exceeded",
      error: "Límite de solicitudes de traducción excedido. Intentá nuevamente en un minuto.",
    });
  }

  const { texts, targetLang } = req.body || {};

  if (!Array.isArray(texts)) {
    return res.status(400).json({
      translated: false,
      texts: [],
      reason: "invalid_payload",
      error: "El campo 'texts' debe ser un arreglo de cadenas.",
    });
  }

  const result = await performTranslation(texts, targetLang);
  return res.json(result);
}
