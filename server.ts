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
  marca: "https://news.google.com/rss/search?q=site:marca.com+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
  as: "https://news.google.com/rss/search?q=site:as.com+%22football%22+OR+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
  lequipe: "https://news.google.com/rss/search?q=site:lequipe.fr+%22football%22&hl=fr&gl=FR&ceid=FR:fr",
  gazzetta: "https://news.google.com/rss/search?q=site:gazzetta.it+%22calcio%22&hl=it&gl=IT&ceid=IT:it",
  kicker: "https://news.google.com/rss/search?q=site:kicker.de+%22fussball%22&hl=de&gl=DE&ceid=DE:de",
  bbc: "https://news.google.com/rss/search?q=site:bbc.com/sport/football&hl=en&gl=GB&ceid=GB:en",
};

const sourceDisplayNames: Record<string, string> = {
  marca: "Marca",
  as: "AS",
  lequipe: "L'Equipe",
  gazzetta: "Gazzetta",
  kicker: "Kicker",
  bbc: "BBC"
};

// RSS Proxy Endpoint
app.get("/api/news", async (req, res) => {
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
      console.error(`Error fetching ${source}:`, error.message);
      return res.json({ items: [], error: error.message });
    }
  }

  // Aggregate
  try {
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
  } catch (error: any) {
    console.error("Aggregation error:", error);
    res.status(500).json({ error: "Failed to fetch news", items: [] });
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
