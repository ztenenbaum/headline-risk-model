"use client";

import { useState } from "react";

type Analysis = {
  ticker: string;
  companyName: string;
  overallScore: number;
  positivePoints: number;
  negativePoints: number;
  outlook: string;
  primarySignal: string;
  headlines: {
    title: string;
    link: string;
    positiveWords: string[];
    negativeWords: string[];
    score: number;
  }[];
};

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!ticker.trim()) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return;
      }

      setAnalysis(data);
    } catch (err) {
      console.error("Analyze failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#171717] flex items-center justify-center px-6">
      <section className="w-full max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
          Zoe Risk Model
        </p>

        <h1 className="mt-5 text-5xl font-serif tracking-tight">
          Analyze stock signals from market news.
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Enter ticker, e.g. NVDA"
            className="w-full sm:w-80 border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
          />

          <button
            type="submit"
            className="bg-black text-white px-6 py-3 hover:bg-gray-800 transition"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {analysis && (
          <div className="mt-12 text-left border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">Ticker</p>
            <h2 className="text-3xl font-serif">
              {analysis.ticker} — {analysis.companyName}
            </h2>

            <div className="mt-6">
              <p className="text-sm text-gray-500">Overall Score</p>
              <p className="text-4xl">{analysis.overallScore}</p>
              <p className="mt-1">{analysis.outlook}</p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Positive Points</p>
                <p className="text-2xl">+{analysis.positivePoints}</p>
              </div>

              <div className="border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Negative Points</p>
                <p className="text-2xl">-{analysis.negativePoints}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-500">Primary Signal</p>
              <p className="text-lg">{analysis.primarySignal}</p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-3">
                Headlines Driving Score
              </p>

              <ul className="space-y-3">
                {analysis.headlines.map((headline, index) => (
                  <li key={index} className="border border-gray-100 p-4">
                    <a
                      href={headline.link}
                      target="_blank"
                      className="underline"
                    >
                      {headline.title}
                    </a>

                    <p className="mt-2 text-sm text-gray-500">
                      Score: {headline.score}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Positive words:{" "}
                      {headline.positiveWords.length
                        ? headline.positiveWords.join(", ")
                        : "none"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Negative words:{" "}
                      {headline.negativeWords.length
                        ? headline.negativeWords.join(", ")
                        : "none"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}