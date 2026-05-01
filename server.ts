import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  timeout: 5000
});

const app = express();
app.use(express.json());

const feeds: Record<string, string> = {
  marca: "https://e00-marca.uecdn.es/rss/futbol.xml",
  as: "https://news.google.com/rss/search?q=site:as.com+%22football%22+OR+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
  lequipe: "https://news.google.com/rss/search?q=site:lequipe.fr+%22football%22&hl=fr&gl=FR&ceid=FR:fr",
  gazzetta: "https://news.google.com/rss/search?q=site:gazzetta.it+%22calcio%22&hl=it&gl=IT&ceid=IT:it",
  kicker: "https://newsfeed.kicker.de/news/aktuell",
  bbc: "https://feeds.bbci.co.uk/sport/football/rss.xml",
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
      return res.json({ ...feed, items: mappedItems });
    } catch (error: any) {
      console.error(`Error fetching ${source}:`, error.message);
      return res.status(500).json({ error: "Failed to fetch feed", details: error.message });
    }
  }

  // Aggregate with a total timeout to prevent serverless function timeout
  try {
    const fetchPromises = Object.entries(feeds).map(async ([name, url]) => {
      try {
        const feed = await parser.parseURL(url);
        return feed.items.map(item => ({
          ...item,
          sourceName: sourceDisplayNames[name] || name.toUpperCase(),
        }));
      } catch (e: any) {
        console.warn(`Failed to fetch ${name}:`, e.message);
        return [];
      }
    });

    // Wait for all OR timeout after 8 seconds
    const results = await Promise.all(fetchPromises);
    const allItems = results.flat().sort((a, b) => {
      return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
    });

    res.json({ items: allItems });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to aggregate feeds", details: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function setupApp() {
  const isProd = process.env.NODE_ENV === "production" || process.env.VITE_PROD === "true" || !!process.env.VERCEL;
  
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // On Vercel, static files are handled by the platform, but this allows it to work in other prod envs
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next();
      });
    });
  }

  // Only listen if explicitly told to or if not on Vercel
  if (!process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupApp();

export default app;
