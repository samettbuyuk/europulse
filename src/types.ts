export interface NewsItem {
  title: string;
  link: string;
  contentSnippet: string;
  pubDate: string;
  sourceName: string;
  content: string;
  author?: string;
  guid?: string;
}

export interface NewsFeed {
  items: NewsItem[];
}

export interface KeywordAnalysis {
  keyword: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  importance: number; // 1-10
}
