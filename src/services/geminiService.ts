import { GoogleGenAI } from "@google/genai";
import { NewsItem } from "../types";

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const ai = new GoogleGenAI({ apiKey });
  return ai.models.generateContent;
}

export async function analyzeNews(news: NewsItem[], keyword: string) {
  const generateContent = getGeminiModel();
  
  const relevantNews = news.slice(0, 10).map(n => ({
    title: n.title,
    snippet: n.contentSnippet,
    source: n.sourceName
  }));

  const prompt = `
    Aşağıdaki haberleri "${keyword}" anahtar kelimesi odağında analiz et. 
    Haberler Avrupa spor basınından alınmıştır.
    
    Haberler:
    ${JSON.stringify(relevantNews)}

    Lütfen şu formatta JSON cevabı dön:
    {
      "summary": "Bu anahtar kelime ile ilgili haberlerin kısa bir özeti (Türkçe)",
      "sentiment": "positive" | "negative" | "neutral",
      "importance": 1-10 arasında önem derecesi,
      "trend": "Bu konudaki genel trend nedir?"
    }
  `;

  try {
    const response = await generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis error:", error);
    return null;
  }
}
