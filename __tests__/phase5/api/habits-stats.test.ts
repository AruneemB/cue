import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { GET } from "@/app/api/habits/stats/route";

describe("GET /api/habits/stats", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single", "gte"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    });
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: result.data ?? null, error: result.error ?? null });
      return chain;
    };
    return chain;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
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

  // ── User Resolution ────────────────────────────────────────

  it("returns 404 when user not found in DB", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("queries users table with correct github_id", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({ data: [] });
    const recentLogsChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    await GET();

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(userChain.eq).toHaveBeenCalledWith("github_id", "12345");
  });

  // ── DB Error Handling ──────────────────────────────────────

  it("returns 500 when allLogs query fails", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({ error: { message: "db error" } });
    const recentLogsChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch stats");
  });

  it("returns 500 when recentLogs query fails", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({ data: [] });
    const recentLogsChain = buildChain({ error: { message: "db error" } });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    expect(res.status).toBe(500);
  });

  // ── Empty Data ─────────────────────────────────────────────

  it("returns zeroed stats when user has no logs", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({ data: [] });
    const recentLogsChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total_xp).toBe(0);
    expect(body.level).toBe(1);
    expect(body.level_progress).toBe(0);
    expect(body.xp_to_next_level).toBe(500);
    expect(body.current_streak).toBe(0);
    expect(body.longest_streak).toBe(0);
    expect(body.last_active_date).toBeNull();
    expect(body.heatmap).toEqual([]);
    expect(body.channel_breakdown).toEqual({});
    expect(body.recent_activity).toEqual([]);
  });

  // ── Response Shape ─────────────────────────────────────────

  it("returns complete response shape with all expected keys", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: [{ xp_earned: 20, type: "github" }],
    });
    const recentLogsChain = buildChain({
      data: [
        {
          id: "log-1",
          type: "github",
          xp_earned: 20,
          logged_at: new Date().toISOString(),
          source_id: "my-repo",
          duration_mins: null,
          notes: null,
        },
      ],
    });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("total_xp");
    expect(body).toHaveProperty("level");
    expect(body).toHaveProperty("level_progress");
    expect(body).toHaveProperty("xp_to_next_level");
    expect(body).toHaveProperty("current_streak");
    expect(body).toHaveProperty("longest_streak");
    expect(body).toHaveProperty("last_active_date");
    expect(body).toHaveProperty("heatmap");
    expect(body).toHaveProperty("channel_breakdown");
    expect(body).toHaveProperty("recent_activity");
  });

  // ── XP Aggregation ─────────────────────────────────────────

  it("sums XP across all logs", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: [
        { xp_earned: 20, type: "github" },
        { xp_earned: 50, type: "leetcode" },
        { xp_earned: 30, type: "roadmap" },
      ],
    });
    const recentLogsChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.total_xp).toBe(100);
    expect(body.level).toBe(1);
    expect(body.level_progress).toBe(100);
    expect(body.xp_to_next_level).toBe(400);
  });

  it("calculates level correctly at boundary (500 XP)", async () => {
    const logs = Array.from({ length: 25 }, () => ({
      xp_earned: 20,
      type: "github",
    })); // 25 * 20 = 500

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({ data: logs });
    const recentLogsChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.total_xp).toBe(500);
    expect(body.level).toBe(2);
    expect(body.level_progress).toBe(0);
    expect(body.xp_to_next_level).toBe(500);
  });

  // ── Heatmap ────────────────────────────────────────────────

  it("aggregates XP by day for heatmap", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const recentLogs = [
      { id: "1", type: "github", xp_earned: 20, logged_at: `${today}T08:00:00Z`, source_id: null, duration_mins: null, notes: null },
      { id: "2", type: "leetcode", xp_earned: 50, logged_at: `${today}T12:00:00Z`, source_id: null, duration_mins: null, notes: null },
    ];

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: [
        { xp_earned: 20, type: "github" },
        { xp_earned: 50, type: "leetcode" },
      ],
    });
    const recentLogsChain = buildChain({ data: recentLogs });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.heatmap).toHaveLength(1);
    expect(body.heatmap[0].date).toBe(today);
    expect(body.heatmap[0].xp).toBe(70); // 20 + 50
  });

  it("returns heatmap entries sorted by date ascending", async () => {
    const day1 = "2025-06-01";
    const day2 = "2025-06-03";
    const recentLogs = [
      { id: "2", type: "github", xp_earned: 20, logged_at: `${day2}T12:00:00Z`, source_id: null, duration_mins: null, notes: null },
      { id: "1", type: "github", xp_earned: 20, logged_at: `${day1}T12:00:00Z`, source_id: null, duration_mins: null, notes: null },
    ];

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: [
        { xp_earned: 20, type: "github" },
        { xp_earned: 20, type: "github" },
      ],
    });
    const recentLogsChain = buildChain({ data: recentLogs });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.heatmap).toHaveLength(2);
    expect(body.heatmap[0].date).toBe(day1);
    expect(body.heatmap[1].date).toBe(day2);
  });

  // ── Channel Breakdown ──────────────────────────────────────

  it("groups activity by channel with counts and XP", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: [
        { xp_earned: 20, type: "github" },
        { xp_earned: 20, type: "github" },
        { xp_earned: 50, type: "leetcode" },
        { xp_earned: 40, type: "kaggle" },
      ],
    });
    const recentLogsChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.channel_breakdown.github).toEqual({ count: 2, xp: 40 });
    expect(body.channel_breakdown.leetcode).toEqual({ count: 1, xp: 50 });
    expect(body.channel_breakdown.kaggle).toEqual({ count: 1, xp: 40 });
  });

  // ── Recent Activity ────────────────────────────────────────

  it("caps recent_activity at 20 entries", async () => {
    const recentLogs = Array.from({ length: 25 }, (_, i) => ({
      id: `log-${i}`,
      type: "github",
      xp_earned: 20,
      logged_at: new Date().toISOString(),
      source_id: null,
      duration_mins: null,
      notes: null,
    }));

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: recentLogs.map((l) => ({ xp_earned: l.xp_earned, type: l.type })),
    });
    const recentLogsChain = buildChain({ data: recentLogs });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.recent_activity).toHaveLength(20);
  });

  it("sets last_active_date from most recent log", async () => {
    const timestamp = "2025-06-15T14:30:00Z";
    const recentLogs = [
      { id: "1", type: "github", xp_earned: 20, logged_at: timestamp, source_id: null, duration_mins: null, notes: null },
    ];

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const allLogsChain = buildChain({
      data: [{ xp_earned: 20, type: "github" }],
    });
    const recentLogsChain = buildChain({ data: recentLogs });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(allLogsChain)
      .mockReturnValueOnce(recentLogsChain);

    const res = await GET();
    const body = await res.json();

    expect(body.last_active_date).toBe(timestamp);
  });
});
