import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { handleTranslateRequest } from "./translate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default environment to production when running node dist/index.js
process.env.NODE_ENV = process.env.NODE_ENV || "production";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.post("/api/translate", handleTranslateRequest);

  // Serve static files from dist/public (or public if running bundled from dist)
  const candidate1 = path.resolve(__dirname, "public");
  const candidate2 = path.resolve(__dirname, "..", "dist", "public");
  const staticPath = fs.existsSync(candidate1) ? candidate1 : candidate2;

  // Custom PWA headers: ensure Service Worker scope and immediate updates
  app.use((req, res, next) => {
    if (req.path === "/sw.js") {
      res.setHeader("Service-Worker-Allowed", "/");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Content-Type", "application/javascript");
    } else if (req.path === "/manifest.json") {
      res.setHeader("Content-Type", "application/manifest+json");
    }
    next();
  });

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all SPA routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
