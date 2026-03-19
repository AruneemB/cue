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

import { POST } from "@/app/api/habits/log/route";

describe("POST /api/habits/log", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single"]) {
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

  function createRequest(body?: unknown) {
    return new Request("http://localhost/api/habits/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : "invalid json{{{",
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ type: "github" }) as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mockAuth.mockResolvedValue({ user: { name: "test" } });
    const res = await POST(createRequest({ type: "github" }) as any);
    expect(res.status).toBe(401);
  });

  // ── Input Validation ───────────────────────────────────────

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/habits/log", {
      method: "POST",
      body: "{{bad json",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 when type is missing", async () => {
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  it("returns 400 for invalid type value", async () => {
    const res = await POST(createRequest({ type: "invalid" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when duration_mins is non-integer", async () => {
    const res = await POST(
      createRequest({ type: "manual", duration_mins: 30.5 }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when duration_mins is 0 (below minimum)", async () => {
    const res = await POST(
      createRequest({ type: "manual", duration_mins: 0 }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when duration_mins is 1441 (above maximum)", async () => {
    const res = await POST(
      createRequest({ type: "manual", duration_mins: 1441 }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when notes exceeds 2000 characters", async () => {
    const res = await POST(
      createRequest({ type: "github", notes: "x".repeat(2001) }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when source_id exceeds 255 characters", async () => {
    const res = await POST(
      createRequest({ type: "github", source_id: "x".repeat(256) }) as any
    );
    expect(res.status).toBe(400);
  });

  // ── User Resolution ────────────────────────────────────────

  it("returns 404 when user not found in DB", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);

    const res = await POST(createRequest({ type: "github" }) as any);
    expect(res.status).toBe(404);
  });

  it("queries users table with correct github_id", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "github", xp_earned: 20 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    await POST(createRequest({ type: "github" }) as any);

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(userChain.select).toHaveBeenCalledWith("id");
    expect(userChain.eq).toHaveBeenCalledWith("github_id", "12345");
  });

  // ── Database Insert ────────────────────────────────────────

  it("returns 500 when habit_logs insert fails", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ error: { message: "insert error" } });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);

    const res = await POST(createRequest({ type: "github" }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to log habit");
  });

  it("inserts with correct fields for github type", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "github", xp_earned: 20 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    await POST(
      createRequest({
        type: "github",
        source_id: "my-repo",
        notes: "Fixed a bug",
      }) as any
    );

    expect(insertChain.insert).toHaveBeenCalledWith({
      user_id: "user-uuid-1",
      type: "github",
      source_id: "my-repo",
      duration_mins: null,
      notes: "Fixed a bug",
      xp_earned: 20,
    });
  });

  // ── XP Calculation ─────────────────────────────────────────

  it("awards 20 XP for github activity", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "github", xp_earned: 20 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(createRequest({ type: "github" }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.xp_earned).toBe(20);
  });

  it("awards 50 XP for leetcode activity", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "leetcode", xp_earned: 50 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(createRequest({ type: "leetcode" }) as any);
    const body = await res.json();

    expect(body.xp_earned).toBe(50);
  });

  it("awards duration-based XP for manual activity", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "manual", xp_earned: 15 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(
      createRequest({ type: "manual", duration_mins: 5 }) as any
    );
    const body = await res.json();

    expect(body.xp_earned).toBe(15); // 10 base + 5 mins
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ xp_earned: 15 })
    );
  });

  // ── Happy Path Response Shape ──────────────────────────────

  it("returns correct response shape on success", async () => {
    const logData = {
      id: "log-uuid-1",
      user_id: "user-uuid-1",
      type: "github",
      xp_earned: 20,
      logged_at: "2025-06-01T12:00:00Z",
      source_id: "my-repo",
      duration_mins: null,
      notes: null,
    };

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ data: logData });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(createRequest({ type: "github" }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("log");
    expect(body).toHaveProperty("xp_earned", 20);
    expect(body).toHaveProperty("streak_bonus", 0);
    expect(body).toHaveProperty("total_xp_awarded", 20);
    expect(body.log).toEqual(logData);
  });

  // ── Streak Bonus ───────────────────────────────────────────

  it("awards streak bonus when streak is a multiple of 7", async () => {
    // Generate 7 consecutive days of activity ending today
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      return { logged_at: d.toISOString() };
    });

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "github", xp_earned: 20 },
    });
    const recentChain = buildChain({ data: dates });
    const bonusInsertChain = buildChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain)
      .mockReturnValueOnce(bonusInsertChain);

    const res = await POST(createRequest({ type: "github" }) as any);
    const body = await res.json();

    expect(body.streak_bonus).toBe(100);
    expect(body.total_xp_awarded).toBe(120); // 20 + 100

    // Verify bonus insert was made
    expect(bonusInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-uuid-1",
        type: "manual",
        source_id: "streak-bonus-7",
        xp_earned: 100,
      })
    );
  });

  it("does not award streak bonus when streak is not a multiple of 7", async () => {
    // 3 consecutive days
    const dates = Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      return { logged_at: d.toISOString() };
    });

    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "github", xp_earned: 20 },
    });
    const recentChain = buildChain({ data: dates });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(createRequest({ type: "github" }) as any);
    const body = await res.json();

    expect(body.streak_bonus).toBe(0);
    expect(body.total_xp_awarded).toBe(20);
  });

  // ── Optional fields ────────────────────────────────────────

  it("accepts valid boundary value duration_mins=1", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "manual", xp_earned: 11 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(
      createRequest({ type: "manual", duration_mins: 1 }) as any
    );
    expect(res.status).toBe(200);
  });

  it("accepts valid boundary value duration_mins=1440", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "manual", xp_earned: 30 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    const res = await POST(
      createRequest({ type: "manual", duration_mins: 1440 }) as any
    );
    expect(res.status).toBe(200);
  });

  it("accepts all five valid activity types", async () => {
    for (const type of ["github", "kaggle", "roadmap", "leetcode", "manual"]) {
      vi.clearAllMocks();
      mockAuth.mockResolvedValue({ githubId: "12345" });

      const userChain = buildChain({ data: { id: "user-uuid-1" } });
      const insertChain = buildChain({
        data: { id: "log-1", type, xp_earned: 10 },
      });
      const recentChain = buildChain({ data: [] });

      mockFrom
        .mockReturnValueOnce(userChain)
        .mockReturnValueOnce(insertChain)
        .mockReturnValueOnce(recentChain);

      const res = await POST(createRequest({ type }) as any);
      expect(res.status).toBe(200);
    }
  });

  it("handles omitted optional fields with null defaults", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({
      data: { id: "log-1", type: "github", xp_earned: 20 },
    });
    const recentChain = buildChain({ data: [] });

    mockFrom
      .mockReturnValueOnce(userChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(recentChain);

    await POST(createRequest({ type: "github" }) as any);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: null,
        duration_mins: null,
        notes: null,
      })
    );
  });
});
