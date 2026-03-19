import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFetchDailyProblem = vi.fn();
const mockCached = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/leetcode", () => ({
  fetchDailyProblem: (...args: unknown[]) => mockFetchDailyProblem(...args),
}));

vi.mock("@/lib/redis", () => ({
  cached: (...args: unknown[]) => mockCached(...args),
}));

import { GET } from "@/app/api/leetcode/daily/route";

describe("GET /api/leetcode/daily", () => {
  const mockChallenge = {
    date: "2025-06-15",
    link: "/problems/two-sum",
    question: {
      title: "Two Sum",
      difficulty: "Easy",
      acRate: 49.5,
      topicTags: [{ name: "Array" }, { name: "Hash Table" }],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345", accessToken: "ghp_test" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mockAuth.mockResolvedValue({ user: { name: "test" } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  // ── Redis caching ──────────────────────────────────────────

  it("calls redis.cached with correct key and 24h TTL", async () => {
    mockCached.mockResolvedValue(mockChallenge);

    await GET();

    expect(mockCached).toHaveBeenCalledWith(
      "leetcode:daily",
      86400,
      expect.any(Function)
    );
  });

  it("returns cached challenge on success", async () => {
    mockCached.mockResolvedValue(mockChallenge);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toEqual(mockChallenge);
  });

  it("returns 503 when cached result is null", async () => {
    mockCached.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("unavailable");
  });

  // ── Fallback (Redis unavailable) ───────────────────────────

  it("falls back to direct fetch when Redis errors", async () => {
    mockCached.mockRejectedValue(new Error("Redis connection failed"));
    mockFetchDailyProblem.mockResolvedValue(mockChallenge);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toEqual(mockChallenge);
    expect(mockFetchDailyProblem).toHaveBeenCalled();
  });

  it("returns 503 when both Redis and direct fetch return null", async () => {
    mockCached.mockRejectedValue(new Error("Redis error"));
    mockFetchDailyProblem.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("returns 502 when both Redis and direct fetch throw", async () => {
    mockCached.mockRejectedValue(new Error("Redis error"));
    mockFetchDailyProblem.mockRejectedValue(new Error("LeetCode API down"));

    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Failed to fetch");
  });

  // ── Cache factory invokes fetchDailyProblem ────────────────

  it("cache factory calls fetchDailyProblem", async () => {
    // Capture the factory function passed to cached()
    mockCached.mockImplementation(async (_key: string, _ttl: number, factory: () => Promise<unknown>) => {
      return factory();
    });
    mockFetchDailyProblem.mockResolvedValue(mockChallenge);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockFetchDailyProblem).toHaveBeenCalled();
  });
});
