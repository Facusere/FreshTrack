import type { IncomingMessage, ServerResponse } from "http";
import { performTranslation } from "../server/translate.js";

type VercelRequest = IncomingMessage & {
  body?: any;
  query?: Record<string, string | string[]>;
};

type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (jsonBody: any) => void;
  send: (body: any) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Parse body if not parsed
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "JSON inválido" });
    }
  }

  const texts = body?.texts;
  const targetLang = body?.targetLang;

  if (!Array.isArray(texts)) {
    return res.status(400).json({
      translated: false,
      texts: [],
      reason: "invalid_payload",
      error: "El campo 'texts' debe ser un arreglo de cadenas.",
    });
  }

  const result = await performTranslation(texts, targetLang);
  return res.status(200).json(result);
}
