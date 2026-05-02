import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import { fileURLToPath } from 'url';
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  timeout: 10000
});

const app = express();
app.use(cors());
app.use(express.json());

const feeds: Record<string, string> = {
  goal: "https://news.google.com/rss/search?q=Goal.com+football&hl=en-US&gl=US&ceid=US:en",
  bbc: "https://news.google.com/rss/search?q=BBC+Sport+football&hl=en-GB&gl=GB&ceid=GB:en",
  skysports: "https://news.google.com/rss/search?q=Sky+Sports+football&hl=en-GB&gl=GB&ceid=GB:en",
  lequipe: "https://news.google.com/rss/search?q=L'Equipe+football&hl=fr&gl=FR&ceid=FR:fr",
  marca: "https://news.google.com/rss/search?q=Marca+futbol&hl=es&gl=ES&ceid=ES:es",
  gazzetta: "https://news.google.com/rss/search?q=Gazzetta+dello+Sport+calcio&hl=it&gl=IT&ceid=IT:it",
  kicker: "https://news.google.com/rss/search?q=Kicker+fussball&hl=de&gl=DE&ceid=DE:de",
  espn: "https://news.google.com/rss/search?q=ESPN+soccer&hl=en-US&gl=US&ceid=US:en",
  guardian: "https://news.google.com/rss/search?q=The+Guardian+football&hl=en-GB&gl=GB&ceid=GB:en",
  "90min": "https://news.google.com/rss/search?q=90min+football&hl=en-US&gl=US&ceid=US:en",
  eurosport: "https://news.google.com/rss/search?q=Eurosport+football&hl=en-GB&gl=GB&ceid=GB:en",
  bleacher: "https://news.google.com/rss/search?q=Bleacher+Report+football&hl=en-US&gl=US&ceid=US:en",
  athletic: "https://news.google.com/rss/search?q=The+Athletic+football&hl=en-US&gl=US&ceid=US:en",
  as: "https://news.google.com/rss/search?q=Diario+AS+futbol&hl=es&gl=ES&ceid=ES:es",
};

const sourceDisplayNames: Record<string, string> = {
  goal: "Goal.com",
  bbc: "BBC Sport",
  skysports: "Sky Sports",
  lequipe: "L'Equipe",
  marca: "Marca",
  gazzetta: "La Gazzetta dello Sport",
  kicker: "Kicker",
  espn: "ESPN",
  guardian: "The Guardian",
  "90min": "90min",
  eurosport: "Eurosport",
  bleacher: "Bleacher Report",
  athletic: "The Athletic",
  as: "AS"
};

// RSS Proxy Endpoint
app.get("/api/news", async (req, res) => {
  try {
    const { source } = req.query;

    if (source && feeds[source as string]) {
      try {
        const feed = await parser.parseURL(feeds[source as string]);
        const mappedItems = feed.items.map(item => ({
          ...item,
          sourceName: sourceDisplayNames[source as string] || (source as string).toUpperCase(),
        }));
        return res.json({ items: mappedItems });
      } catch (error: any) {
        console.error(`Error fetching individual source ${source}:`, error.message);
        return res.json({ items: [], error: `Kaynak hatası: ${error.message}` });
      }
    }

    // Aggregate
    const fetchPromises = Object.entries(feeds).map(async ([name, url]) => {
      try {
        const feed = await parser.parseURL(url);
        return feed.items.map(item => ({
          ...item,
          sourceName: sourceDisplayNames[name] || name.toUpperCase(),
        }));
      } catch (e: any) {
        console.error(`Failed to fetch ${name}:`, e.message);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allItems = results.flat().sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    res.json({ items: allItems.slice(0, 100) });
  } catch (globalError: any) {
    console.error("Aggregation error:", globalError);
    res.json({ items: [], error: "Haber servisi hatası", details: globalError.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath, { index: false }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next();
    });
  });
}

const PORT = 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
