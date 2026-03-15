import type { DailyChallenge, DailyChallengeResponse } from "@/types/leetcode";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const DAILY_PROBLEM_QUERY = `
  query questionOfToday {
    activeDailyCodingChallengeQuestion {
      date
      link
      question {
        title
        difficulty
        acRate
        topicTags { name }
      }
    }
  }
`;

export async function fetchDailyProblem(): Promise<DailyChallenge | null> {
  try {
    const res = await fetch(LEETCODE_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: DAILY_PROBLEM_QUERY }),
    });

    if (!res.ok) {
      console.error("LeetCode API error:", res.status);
      return null;
    }

    const json: DailyChallengeResponse = await res.json();
    return json.data.activeDailyCodingChallengeQuestion ?? null;
  } catch (err) {
    console.error("Failed to fetch LeetCode daily problem:", err);
    return null;
  }
}

export function formatDailyProblemText(challenge: DailyChallenge): string {
  const { title, difficulty, topicTags } = challenge.question;
  const tags = topicTags.map((t) => t.name).join(", ");
  return `LeetCode Daily: ${title} (${difficulty}) — ${tags}. Solve it →`;
}
