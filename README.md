This Risk Model is an NLP-driven stock signal platform that analyzes real-time financial news and converts it into a structured, explainable score.

Instead of labeling a stock as simply “risky,” the model evaluates both positive and negative signals in recent headlines to produce a balanced view of market sentiment.

---

## What it does

Input a stock ticker (e.g. NVDA, TSLA), and the system:

- Fetches recent news headlines from Yahoo Finance
- Extracts signal-bearing keywords from each headline
- Assigns positive and negative weights based on financial context
- Computes an overall score:

  overallScore = positivePoints - negativePoints

- Identifies the primary signal category
- Surfaces the headlines driving the score

---

Ongoing work includes transitioning from rule-based NLP to deep learning models (e.g., FinBERT) to better capture context and improve sentiment accuracy.

In the process of putting this on vercel for use.