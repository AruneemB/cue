import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchDailyProblem } from "@/lib/leetcode";
import * as redis from "@/lib/redis";

const CACHE_KEY = "leetcode:daily";
const CACHE_TTL = 24 * 60 * 60; // 24 hours

export async function GET() {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const challenge = await redis.cached(CACHE_KEY, CACHE_TTL, async () => {
      const problem = await fetchDailyProblem();
      return problem;
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "LeetCode daily problem unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ challenge });
  } catch (err) {
    // If Redis is unavailable, fetch directly
    console.error("Cache error, fetching directly:", err);
    try {
      const challenge = await fetchDailyProblem();
      if (!challenge) {
        return NextResponse.json(
          { error: "LeetCode daily problem unavailable" },
          { status: 503 }
        );
      }
      return NextResponse.json({ challenge });
    } catch (fetchErr) {
      console.error("Failed to fetch LeetCode daily:", fetchErr);
      return NextResponse.json(
        { error: "Failed to fetch daily problem" },
        { status: 502 }
      );
    }
  }
}
