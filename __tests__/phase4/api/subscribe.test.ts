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

import { POST } from "@/app/api/notify/subscribe/route";

describe("POST /api/notify/subscribe", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: result.data ?? null, error: result.error ?? null });
      return chain;
    };
    return chain;
  }

  function createRequest(body?: unknown) {
    return new Request("http://localhost/api/notify/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : "invalid json{{{",
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 when no githubId in session", async () => {
    mockAuth.mockResolvedValue({ user: { name: "test" } });
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/notify/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all{{{",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid subscription (bad URL)", async () => {
    const res = await POST(
      createRequest({
        endpoint: "not-a-url",
        keys: { p256dh: "key1", auth: "key2" },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing keys", async () => {
    const res = await POST(
      createRequest({
        endpoint: "https://push.example.com/sub",
        keys: { p256dh: "" },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("updates push_subscription on valid request", async () => {
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const validSub = {
      endpoint: "https://push.example.com/sub",
      keys: { p256dh: "valid-key", auth: "valid-auth" },
    };

    const res = await POST(createRequest(validSub) as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(chain.update).toHaveBeenCalledWith({
      push_subscription: validSub,
    });
    expect(chain.eq).toHaveBeenCalledWith("github_id", "12345");
  });

  it("returns 500 on Supabase error", async () => {
    const chain = buildChain({ error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const validSub = {
      endpoint: "https://push.example.com/sub",
      keys: { p256dh: "key1", auth: "key2" },
    };

    const res = await POST(createRequest(validSub) as any);
    expect(res.status).toBe(500);
  });
});
