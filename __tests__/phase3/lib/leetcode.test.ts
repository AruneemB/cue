import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockChallenge,
  createMockFetchResponse,
} from "@/__tests__/helpers/mocks";

import { fetchDailyProblem, formatDailyProblemText } from "@/lib/leetcode";

describe("formatDailyProblemText", () => {
  it("formats challenge with multiple tags", () => {
    const challenge = createMockChallenge();
    const text = formatDailyProblemText(challenge);
    expect(text).toBe(
      "LeetCode Daily: Two Sum (Easy) — Array, Hash Table. Solve it →"
    );
  });

  it("formats challenge with single tag", () => {
    const challenge = createMockChallenge({
      question: {
        title: "Binary Search",
        difficulty: "Medium",
        acRate: 60.0,
        topicTags: [{ name: "Binary Search" }],
      },
    });
    const text = formatDailyProblemText(challenge);
    expect(text).toBe(
      "LeetCode Daily: Binary Search (Medium) — Binary Search. Solve it →"
    );
  });

  it("formats challenge with empty tags", () => {
    const challenge = createMockChallenge({
      question: {
        title: "Mystery",
        difficulty: "Hard",
        acRate: 5.0,
        topicTags: [],
      },
    });
    const text = formatDailyProblemText(challenge);
    expect(text).toBe("LeetCode Daily: Mystery (Hard) — . Solve it →");
  });
});

describe("fetchDailyProblem", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs to LeetCode GraphQL endpoint", async () => {
    const challenge = createMockChallenge();
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        data: { activeDailyCodingChallengeQuestion: challenge },
      })
    );

    await fetchDailyProblem();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://leetcode.com/graphql",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    // Verify body contains the query
    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(callArgs.body as string);
    expect(body.query).toContain("questionOfToday");
  });

  it("returns DailyChallenge on success", async () => {
    const challenge = createMockChallenge();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        data: { activeDailyCodingChallengeQuestion: challenge },
      })
    );

    const result = await fetchDailyProblem();
    expect(result).toEqual(challenge);
  });

  it("returns null on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({}, { status: 500, ok: false })
    );

    const result = await fetchDailyProblem();
    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network error")
    );

    const result = await fetchDailyProblem();
    expect(result).toBeNull();
  });

  it("returns null when data is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        data: { activeDailyCodingChallengeQuestion: null },
      })
    );

    const result = await fetchDailyProblem();
    expect(result).toBeNull();
  });
});
