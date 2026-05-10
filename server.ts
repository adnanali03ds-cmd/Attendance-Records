import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // Basic API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "Operational", 
      system: "THE GUIDE ACADEMY Node Service",
      timestamp: new Date().toISOString()
    });
  });

  // Vite integration
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
    console.log(`\n🚀 THE GUIDE ACADEMY Node Server Running`);
    console.log(`🔗 Local Interface: http://0.0.0.0:${PORT}`);
    console.log(`📂 Base Directory: ${process.cwd()}\n`);
  });
}

startServer().catch((err) => {
  console.error("Critical Failure in Server Initialization:", err);
  process.exit(1);
});
