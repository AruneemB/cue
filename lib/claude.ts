import Anthropic from "@anthropic-ai/sdk";
import type { QuantIdea } from "@/types/claude";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

const RESEARCH_THEMES = [
  "momentum strategies",
  "mean-reversion signals",
  "volatility surface arbitrage",
  "macro factor modeling",
  "NLP on SEC 8-K filings",
  "post-earnings announcement drift",
  "options flow analysis",
  "regime detection with HMMs",
  "statistical pairs trading",
  "alternative data — satellite imagery",
  "alternative data — credit card transactions",
  "social media sentiment for alpha",
  "intraday microstructure patterns",
  "cross-asset correlation breakdowns",
  "term structure carry trades",
  "event-driven merger arbitrage",
  "high-frequency order book imbalance",
  "credit spread momentum",
  "commodity futures curve modeling",
  "machine learning for factor timing",
  "tail risk hedging strategies",
  "cryptocurrency cross-exchange arbitrage",
  "ESG factor premium analysis",
  "central bank NLP signal extraction",
  "implied volatility skew trading",
  "sector rotation with macro indicators",
  "earnings call transcript sentiment",
  "dark pool activity signals",
  "convertible bond arbitrage",
  "volatility risk premium harvesting",
];

export function sampleTheme(exclude: string[] = []): string {
  const available = RESEARCH_THEMES.filter((t) => !exclude.includes(t));
  const pool = available.length > 0 ? available : RESEARCH_THEMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generateQuantIdea(
  theme?: string
): Promise<QuantIdea | null> {
  const selectedTheme = theme ?? sampleTheme();

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system:
        "You are a quantitative finance researcher. Return only valid JSON.",
      messages: [
        {
          role: "user",
          content: `Generate a rigorous, professional-grade quant research project.
Theme: ${selectedTheme}
Return: { "title": string, "hypothesis": string, "dataset": string, "methodology": string, "eval_metric": string, "difficulty": "beginner" | "intermediate" | "advanced" }
Avoid toy examples. Target graduate or professional scope.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const idea: QuantIdea = JSON.parse(text);
    return idea;
  } catch (err) {
    console.error("Failed to generate quant idea:", err);
    return null;
  }
}

export function formatQuantIdeaText(idea: QuantIdea): string {
  return `Quant idea: ${idea.title} — ${idea.hypothesis}. Tap to expand.`;
}
