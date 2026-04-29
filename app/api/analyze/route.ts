import { NextResponse } from "next/server";

function decodeHtml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractItems(xml: string) {
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex =
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;

  const items = [];
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = item.match(titleRegex);
    const linkMatch = item.match(linkRegex);

    const title = decodeHtml(titleMatch?.[1] || titleMatch?.[2] || "");
    const link = decodeHtml(linkMatch?.[1] || "");

    if (title) {
      items.push({ title, link });
    }
  }

  return items.slice(0, 10);
}

const riskKeywords: Record<string, number> = {
  lawsuit: 12,
  investigation: 12,
  probe: 10,
  fraud: 15,
  decline: 8,
  falls: 7,
  drops: 7,
  warning: 8,
  weak: 7,
  slowdown: 8,
  misses: 10,
  loss: 8,
  layoffs: 9,
  recall: 12,
  ban: 12,
  regulation: 9,
  antitrust: 13,
  debt: 8,
  downgrade: 10,
  volatility: 6,
  risk: 5,
  uncertainty: 6,
  pressure: 6,
};

const concernCategories: Record<string, string[]> = {
  "Legal / regulatory pressure": [
    "lawsuit",
    "investigation",
    "probe",
    "fraud",
    "ban",
    "regulation",
    "antitrust",
  ],
  "Financial weakness": [
    "decline",
    "falls",
    "drops",
    "weak",
    "misses",
    "loss",
    "debt",
    "downgrade",
  ],
  "Operational risk": ["layoffs", "recall", "slowdown"],
  "Market uncertainty": ["volatility", "risk", "uncertainty", "pressure"],
};

function scoreHeadline(title: string) {
  const lowerTitle = title.toLowerCase();

  const riskWords = Object.keys(riskKeywords).filter((word) =>
    lowerTitle.includes(word)
  );

  const score = riskWords.reduce((sum, word) => sum + riskKeywords[word], 0);

  return {
    title,
    riskWords,
    score,
  };
}

function getRiskLevel(score: number) {
  if (score >= 65) return "High";
  if (score >= 35) return "Moderate";
  return "Low";
}

function getPrimaryConcern(allRiskWords: string[]) {
  let bestCategory = "General market risk";
  let bestCount = 0;

  for (const [category, words] of Object.entries(concernCategories)) {
    const count = allRiskWords.filter((word) => words.includes(word)).length;

    if (count > bestCount) {
      bestCount = count;
      bestCategory = category;
    }
  }

  return bestCategory;
}


export async function POST(req: Request) {
    try {
      const body = await req.json();
      const ticker = String(body.ticker || "").trim().toUpperCase();
  
      console.log("Analyzing ticker:", ticker);
  
      if (!ticker) {
        return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
      }
         
      
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}`
      );
      
      const data = await res.json();
      
      const companyName = data?.name || ticker;

      const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
  
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
  
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
  
      clearTimeout(timeout);
  
      
  
      if (!response.ok) {
        return NextResponse.json(
          { error: `Yahoo fetch failed with status ${response.status}` },
          { status: 500 }
        );
      }
  
      const xml = await response.text();
      const items = extractItems(xml);
  
      console.log("Items found:", items.length);
  
      const scoredHeadlines = items.map((item) => {
        const scored = scoreHeadline(item.title);
  
        return {
          title: item.title,
          link: item.link,
          riskWords: scored.riskWords,
          score: scored.score,
        };
      });
  
      const rawScore = scoredHeadlines.reduce((sum, item) => sum + item.score, 0);
      const riskScore = Math.min(100, rawScore);
      const allRiskWords = scoredHeadlines.flatMap((item) => item.riskWords);
  
      return NextResponse.json({
        ticker,
        companyName,
        riskScore,
        riskLevel: getRiskLevel(riskScore),
        primaryConcern: getPrimaryConcern(allRiskWords),
        headlines: scoredHeadlines,
      });
    } catch (err) {
      console.error("API error:", err);
  
      return NextResponse.json(
        { error: "Analyze route failed" },
        { status: 500 }
      );
    }
  }