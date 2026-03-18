import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupTestEnv } from "@/__tests__/helpers/mocks";

const mockAuth = vi.fn();
const mockFrom = vi.fn();
const mockVerifySnoozeToken = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/push", () => ({
  verifySnoozeToken: (...args: unknown[]) => mockVerifySnoozeToken(...args),
}));

import { POST } from "@/app/api/notify/snooze/route";

describe("POST /api/notify/snooze", () => {
  let cleanup: () => void;

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
    return new Request("http://localhost/api/notify/snooze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : "bad json{",
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup = setupTestEnv();
    mockAuth.mockResolvedValue({ githubId: "12345" });
    mockVerifySnoozeToken.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("returns 401 when unauthenticated and no token", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ minutes: 30 }) as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/notify/snooze", {
      method: "POST",
      body: "{{bad",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when minutes is missing", async () => {
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when minutes is 0 (below minimum)", async () => {
    const res = await POST(createRequest({ minutes: 0 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when minutes is 481 (above maximum)", async () => {
    const res = await POST(createRequest({ minutes: 481 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when minutes is not integer (30.5)", async () => {
    const res = await POST(createRequest({ minutes: 30.5 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 401 when session user not found in DB and no token", async () => {
    const chain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(chain);

    const res = await POST(createRequest({ minutes: 30 }) as any);
    expect(res.status).toBe(401);
  });

  it("calculates snoozed_until correctly via session auth", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    // First call: get user by github_id
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    // Second call: update notification
    const updateChain = buildChain({ data: null, error: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await POST(createRequest({ minutes: 60 }) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    const expected = new Date(now + 60 * 60 * 1000).toISOString();
    expect(body.snoozed_until).toBe(expected);

    vi.restoreAllMocks();
  });

  it("returns 500 on update error", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ error: { message: "DB error" } });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await POST(createRequest({ minutes: 30 }) as any);
    expect(res.status).toBe(500);
  });

  it("accepts valid boundary value minutes=1", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await POST(createRequest({ minutes: 1 }) as any);
    expect(res.status).toBe(200);
  });

  it("accepts valid boundary value minutes=480", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await POST(createRequest({ minutes: 480 }) as any);
    expect(res.status).toBe(200);
  });

  // ── Snooze token auth tests ──────────────────────────────

  it("accepts snooze token when session is absent", async () => {
    mockAuth.mockResolvedValue(null);
    mockVerifySnoozeToken.mockReturnValue("user-uuid-1");

    const updateChain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(updateChain);

    const res = await POST(
      createRequest({ minutes: 30, snoozeToken: "valid-token" }) as any
    );
    expect(res.status).toBe(200);
    expect(mockVerifySnoozeToken).toHaveBeenCalledWith("valid-token");
  });

  it("uses session auth over token when both are present", async () => {
    const userChain = buildChain({ data: { id: "session-user" } });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockVerifySnoozeToken.mockReturnValue("token-user");

    const res = await POST(
      createRequest({ minutes: 30, snoozeToken: "some-token" }) as any
    );
    expect(res.status).toBe(200);
    // Token verify should NOT have been called since session succeeded
    expect(mockVerifySnoozeToken).not.toHaveBeenCalled();
  });

  it("falls back to token when session user not found in DB", async () => {
    const userChain = buildChain({ data: null, error: null });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockVerifySnoozeToken.mockReturnValue("token-user-id");

    const res = await POST(
      createRequest({ minutes: 30, snoozeToken: "fallback-token" }) as any
    );
    expect(res.status).toBe(200);
    expect(mockVerifySnoozeToken).toHaveBeenCalledWith("fallback-token");
  });

  it("returns 401 when both session and token fail", async () => {
    mockAuth.mockResolvedValue(null);
    mockVerifySnoozeToken.mockReturnValue(null);

    const res = await POST(
      createRequest({ minutes: 30, snoozeToken: "invalid-token" }) as any
    );
    expect(res.status).toBe(401);
  });

  it("snoozeToken field is optional in request body", async () => {
    // Session auth without snoozeToken in body should still work
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await POST(createRequest({ minutes: 30 }) as any);
    expect(res.status).toBe(200);
  });
});
