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
  goal: "https://news.google.com/rss/search?q=Goal.com+football&hl=en-US&gl=US&ceid=US:en",
  bbc: "https://news.google.com/rss/search?q=BBC+Sport+football&hl=en-GB&gl=GB&ceid=GB:en",
  skysports: "https://news.google.com/rss/search?q=Sky+Sports+football&hl=en-GB&gl=GB&ceid=GB:en",
  lequipe: "https://news.google.com/rss/search?q=site:lequipe.fr+%22football%22&hl=fr&gl=FR&ceid=FR:fr",
  marca: "https://news.google.com/rss/search?q=site:marca.com+%22football%22+OR+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
  gazzetta: "https://news.google.com/rss/search?q=site:gazzetta.it+%22calcio%22&hl=it&gl=IT&ceid=IT:it",
  kicker: "https://news.google.com/rss/search?q=site:kicker.de+%22fussball%22&hl=de&gl=DE&ceid=DE:de",
  espn: "https://news.google.com/rss/search?q=ESPN+soccer&hl=en-US&gl=US&ceid=US:en",
  guardian: "https://news.google.com/rss/search?q=The+Guardian+football&hl=en-GB&gl=GB&ceid=GB:en",
  "90min": "https://news.google.com/rss/search?q=90min+football&hl=en-US&gl=US&ceid=US:en",
  eurosport: "https://news.google.com/rss/search?q=Eurosport+football&hl=en-GB&gl=GB&ceid=GB:en",
  bleacher: "https://news.google.com/rss/search?q=Bleacher+Report+football&hl=en-US&gl=US&ceid=US:en",
  athletic: "https://news.google.com/rss/search?q=The+Athletic+football&hl=en-US&gl=US&ceid=US:en",
  as: "https://news.google.com/rss/search?q=site:as.com+%22football%22+OR+%22futbol%22&hl=es&gl=ES&ceid=ES:es",
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Add CORS headers
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
      try {
        const feed = await parser.parseURL(feeds[source as string]);
        const mappedItems = feed.items.map(item => ({
          ...item,
          sourceName: sourceDisplayNames[source as string] || (source as string).toUpperCase(),
        }));
        return res.status(200).json({ items: mappedItems });
      } catch (error: any) {
        console.error(`Error fetching individual source ${source}:`, error.message);
        return res.status(200).json({ items: [], error: `Kaynak hatası: ${error.message}` });
      }
    }

    // Parallel fetch with individual timeouts/errors handled
    const fetchPromises = Object.entries(feeds).map(async ([name, url]): Promise<any[]> => {
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

    const results = await Promise.all(fetchPromises);
    const allItems = results.flat().sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    return res.status(200).json({ items: allItems.slice(0, 100) });
  } catch (globalError: any) {
    console.error("Critical API error:", globalError);
    return res.status(200).json({ 
      items: [], 
      error: "Haber servisi geçici olarak ulaşılamaz durumda.",
      details: globalError.message 
    });
  }
}
