"use client";

import { useState } from "react";

type Analysis = {
  ticker: string;
  companyName: string;
  riskScore: number;
  riskLevel: string;
  primaryConcern: string;
  headlines: {
    title: string;
    link: string;
    riskWords: string[];
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
          Analyze stock risk from market news.
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
            <h2 className="text-3xl font-serif">{analysis.ticker} — {analysis.companyName}</h2>

            <div className="mt-6">
              <p className="text-sm text-gray-500">Risk Score</p>
              <p className="text-4xl">{analysis.riskScore}/100</p>
              <p className="mt-1">{analysis.riskLevel} Risk</p>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-500">Primary Concern</p>
              <p className="text-lg">{analysis.primaryConcern}</p>
            </div>

            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-3">
                Headlines Driving Risk
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
                      Score: {headline.score} | Risk words:{" "}
                      {headline.riskWords.length
                        ? headline.riskWords.join(", ")
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