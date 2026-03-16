import type { QuantIdea, MicroTask } from "@/types/ai";
import { z } from "zod";

const QuantIdeaSchema = z.object({
  title: z.string(),
  hypothesis: z.string(),
  dataset: z.string(),
  methodology: z.string(),
  eval_metric: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

const MicroTaskSchema = z.object({
  task_description: z.string(),
  resource_link: z.string(),
  hands_on_exercise: z.string(),
});

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-pro-preview";

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env variable ${name}`);
  }
  return value;
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1].trim() : trimmed;
}

async function chatCompletion(
  system: string,
  userMessage: string
): Promise<string> {
  const apiKey = getEnvVar("OPENROUTER_API_KEY");
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API error: ${res.status} ${res.statusText}`);
  }

  const data: ChatCompletionResponse = await res.json();
  return stripMarkdownFences(data.choices[0].message.content);
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
    const text = await chatCompletion(
      "You are a quantitative finance researcher. Return only valid JSON.",
      `Generate a rigorous, professional-grade quant research project.
Theme: ${selectedTheme}
Return: { "title": string, "hypothesis": string, "dataset": string, "methodology": string, "eval_metric": string, "difficulty": "beginner" | "intermediate" | "advanced" }
Avoid toy examples. Target graduate or professional scope.`
    );

    const idea = QuantIdeaSchema.parse(JSON.parse(text));
    return idea;
  } catch (err) {
    console.error("Failed to generate quant idea:", err);
    return null;
  }
}

export function formatQuantIdeaText(idea: QuantIdea): string {
  return `Quant idea: ${idea.title} — ${idea.hypothesis}. Tap to expand.`;
}

export async function generateMicroTask(
  nodeName: string,
  roadmapName: string
): Promise<MicroTask | null> {
  try {
    const text = await chatCompletion(
      "You are a software engineering mentor. Return only valid JSON.",
      `Given skill node "${nodeName}" on the ${roadmapName} roadmap, provide a focused 20-minute hands-on micro-task to meaningfully advance this skill.
Return: { "task_description": string, "resource_link": string, "hands_on_exercise": string }`
    );

    const task = MicroTaskSchema.parse(JSON.parse(text));
    return task;
  } catch (err) {
    console.error("Failed to generate micro-task:", err);
    return null;
  }
}

export function formatMicroTaskText(
  nodeName: string,
  task: MicroTask
): string {
  return `Roadmap: Work on ${nodeName}. Today's task: ${task.task_description}`;
}
