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

const positiveKeywords: Record<string, number> = {
  // earnings / financial strength
  growth: 10,
  gains: 8,
  rises: 8,
  jumps: 9,
  beats: 12,
  strong: 8,
  profit: 8,
  record: 9,
  revenue: 6,
  surge: 9,
  rally: 9,
  upside: 8,

  // analyst / sentiment
  upgrade: 10,
  bullish: 10,
  outperform: 10,
  buy: 8,
  optimistic: 7,
  confidence: 7,

  // business momentum
  partnership: 7,
  expansion: 8,
  demand: 7,
  innovation: 7,
  launches: 6,
  breakthrough: 10,
  deal: 6,
  contract: 7,
  acquisition: 6,
  merger: 6,

  // macro / positioning
  leadership: 6,
  dominance: 8,
  efficiency: 6,
  scaling: 7,
};

const negativeKeywords: Record<string, number> = {
  // legal / regulatory
  lawsuit: 12,
  investigation: 12,
  probe: 10,
  fraud: 15,
  ban: 12,
  regulation: 9,
  antitrust: 13,
  compliance: 7,

  // financial weakness
  decline: 8,
  falls: 7,
  drops: 7,
  weak: 7,
  misses: 10,
  loss: 8,
  debt: 8,
  downgrade: 10,
  slowdown: 8,
  recession: 9,
  deficit: 7,

  // operations / internal issues
  layoffs: 9,
  recall: 12,
  delays: 8,
  disruption: 8,
  shortage: 7,
  outage: 8,
  failure: 9,

  // market sentiment
  volatility: 6,
  risk: 5,
  uncertainty: 6,
  pressure: 6,
  concern: 6,
  fear: 7,
  bearish: 9,

  // negative catalysts
  selloff: 10,
  slump: 9,
  warning: 8,
  cut: 7,
  downgrade: 10,
};

const signalCategories: Record<string, string[]> = {
  "Positive earnings / growth signal": [
    "growth",
    "gains",
    "rises",
    "jumps",
    "beats",
    "strong",
    "profit",
    "record",
  ],
  "Positive business momentum": [
    "upgrade",
    "bullish",
    "partnership",
    "expansion",
    "demand",
    "innovation",
    "launches",
  ],
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

function matchesWord(text: string, word: string) {
  return new RegExp(`\\b${word}`, "i").test(text);
}

function scoreHeadline(title: string) {
  const lowerTitle = title.toLowerCase();

  const positiveWords = Object.keys(positiveKeywords).filter((word) =>
    matchesWord(lowerTitle, word)
  );

  const negativeWords = Object.keys(negativeKeywords).filter((word) =>
    matchesWord(lowerTitle, word)
  );

  const positiveScore = positiveWords.reduce(
    (sum, word) => sum + positiveKeywords[word],
    0
  );

  const negativeScore = negativeWords.reduce(
    (sum, word) => sum + negativeKeywords[word],
    0
  );

  return {
    title,
    positiveWords,
    negativeWords,
    score: positiveScore - negativeScore,
    positiveScore,
    negativeScore,
  };
}

function getOutlook(score: number) {
  if (score >= 25) return "Positive signal";
  if (score <= -25) return "Negative signal";
  return "Mixed / neutral signal";
}

function getPrimarySignal(allWords: string[]) {
  let bestCategory = "General market signal";
  let bestCount = 0;

  for (const [category, words] of Object.entries(signalCategories)) {
    const count = allWords.filter((word) => words.includes(word)).length;

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

    const scoredHeadlines = items.map((item) => {
      const scored = scoreHeadline(item.title);

      return {
        title: item.title,
        link: item.link,
        positiveWords: scored.positiveWords,
        negativeWords: scored.negativeWords,
        score: scored.score,
      };
    });

    const positivePoints = scoredHeadlines.reduce((sum, item) => {
      return sum + item.positiveWords.reduce((s, word) => s + positiveKeywords[word], 0);
    }, 0);

    const negativePoints = scoredHeadlines.reduce((sum, item) => {
      return sum + item.negativeWords.reduce((s, word) => s + negativeKeywords[word], 0);
    }, 0);

    const overallScore = positivePoints - negativePoints;
    const allWords = scoredHeadlines.flatMap((item) => [
      ...item.positiveWords,
      ...item.negativeWords,
    ]);

    return NextResponse.json({
      ticker,
      companyName,
      overallScore,
      positivePoints,
      negativePoints,
      outlook: getOutlook(overallScore),
      primarySignal: getPrimarySignal(allWords),
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