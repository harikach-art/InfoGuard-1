import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./server/app";
const PORT = 3e3;
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`InfoGuard server is running at http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal server start error:", err);
  process.exit(1);
});
