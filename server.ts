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
    console.log("🛠️ Starting in DEVELOPMENT mode with Vite Middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("📦 Starting in PRODUCTION mode serving static files");
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    app.use(express.static(distPath));
    
    // SPA Fallback: Send index.html for any other request
    app.get('*', (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`❌ Error sending index.html: ${err.message}`);
          res.status(404).send("Application build artifacts not found. Please ensure 'npm run build' was successful.");
        }
      });
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
