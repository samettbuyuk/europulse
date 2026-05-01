import Parser from "rss-parser";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
  timeout: 5000
});

const feeds: Record<string, string> = {
  marca: "https://news.google.com/rss/search?q=site:marca.com+%22football%22+OR+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
  as: "https://news.google.com/rss/search?q=site:as.com+%22football%22+OR+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
  lequipe: "https://news.google.com/rss/search?q=site:lequipe.fr+%22football%22&hl=fr&gl=FR&ceid=FR:fr",
  gazzetta: "https://news.google.com/rss/search?q=site:gazzetta.it+%22calcio%22&hl=it&gl=IT&ceid=IT:it",
  kicker: "https://news.google.com/rss/search?q=site:kicker.de+%22fussball%22&hl=de&gl=DE&ceid=DE:de",
  bbc: "https://news.google.com/rss/search?q=site:bbc.com/sport/football&hl=en-GB&gl=GB&ceid=GB:en",
};

const sourceDisplayNames: Record<string, string> = {
  marca: "Marca",
  as: "AS",
  lequipe: "L'Equipe",
  gazzetta: "Gazzetta",
  kicker: "Kicker",
  bbc: "BBC"
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers manually just in case
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { source } = req.query;

  if (source && feeds[source as string]) {
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        const feed = await parser.parseURL(feeds[source as string]);
        const mappedItems = feed.items.map(item => ({
          ...item,
          sourceName: sourceDisplayNames[source as string] || (source as string).toUpperCase(),
        }));
        return res.json({ items: mappedItems });
      } catch (error: any) {
        attempts++;
        if (attempts === maxAttempts) {
          console.error(`Error fetching ${source}:`, error.message);
          return res.json({ items: [], error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  try {
    const fetchPromises = Object.entries(feeds).map(async ([name, url]): Promise<any[]> => {
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        try {
          const feed = await parser.parseURL(url);
          return feed.items.map(item => ({
            ...item,
            sourceName: sourceDisplayNames[name] || name.toUpperCase(),
          }));
        } catch (e: any) {
          attempts++;
          if (attempts === maxAttempts) {
            console.error(`Failed to fetch ${name} after ${maxAttempts} attempts:`, e.message);
            return [];
          }
          await new Promise(resolve => setTimeout(resolve, 500)); // Short wait between retries
        }
      }
      return [];
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
}
