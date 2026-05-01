import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const parser = new Parser({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  });

  app.use(express.json());

  // RSS Proxy Endpoint
  app.get("/api/news", async (req, res) => {
    const { source } = req.query;
    
    const feeds: Record<string, string> = {
      marca: "https://e00-marca.uecdn.es/rss/futbol.xml",
      as: "https://as.com/rss/futbol/portada.xml",
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

    if (source && feeds[source as string]) {
      try {
        const feed = await parser.parseURL(feeds[source as string]);
        const mappedItems = feed.items.map(item => ({
          ...item,
          sourceName: sourceDisplayNames[source as string] || (source as string).toUpperCase(),
        }));
        return res.json({ ...feed, items: mappedItems });
      } catch (error) {
        console.error(`Error fetching ${source}:`, error);
        return res.status(500).json({ error: "Failed to fetch feed" });
      }
    }

    // Default: Fetch all and aggregate
    try {
      const results = await Promise.all(
        Object.entries(feeds).map(async ([name, url]) => {
          try {
            const feed = await parser.parseURL(url);
            return {
              source: name,
              items: feed.items.map(item => ({
                ...item,
                sourceName: sourceDisplayNames[name] || name.toUpperCase(),
              })),
            };
          } catch (e) {
            console.warn(`Failed to fetch ${name}:`, e);
            return { source: name, items: [] };
          }
        })
      );
      
      const allItems = results.flatMap(r => r.items).sort((a, b) => {
        return new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime();
      });

      res.json({ items: allItems });
    } catch (error) {
      res.status(500).json({ error: "Failed to aggregate feeds" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve static files in production
  const isProd = process.env.NODE_ENV === "production" || process.env.VITE_PROD === "true";
  
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
      // Don't handle API routes as static files
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
