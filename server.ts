import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

import nhansuHandler from "./api/nhansu";
import nhiemvuHandler from "./api/nhiemvu";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes (Vercel compatible handlers)
  app.all("/api/nhansu", (req, res) => import("./api/nhansu.js").then(m => m.default(req, res)));
  app.all("/api/nhiemvu", (req, res) => import("./api/nhiemvu.js").then(m => m.default(req, res)));
  app.all("/api/data", (req, res) => import("./api/data.js").then(m => m.default(req, res)));
  app.all("/api/init-thang", (req, res) => import("./api/init-thang.js").then(m => m.default(req, res)));
  app.all("/api/save", (req, res) => import("./api/save.js").then(m => m.default(req, res)));
  app.all("/api/kpi-canhan", (req, res) => import("./api/kpi-canhan.js").then(m => m.default(req, res)));
  app.all("/api/kpi-phutrach", (req, res) => import("./api/kpi-phutrach.js").then(m => m.default(req, res)));
  app.all("/api/dashboard", (req, res) => import("./api/dashboard.js").then(m => m.default(req, res)));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
