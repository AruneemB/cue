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

import { GET, PATCH } from "@/app/api/kaggle/ideas/route";

describe("GET /api/kaggle/ideas", () => {
  function buildChain(result: { data?: unknown; error?: unknown; count?: number }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single", "range"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    });
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? 0 });
      return chain;
    };
    return chain;
  }

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost/api/kaggle/ideas");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return new Request(url.toString());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(401);
  });

  // ── User Resolution ────────────────────────────────────────

  it("returns 404 when user not found", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);

    const res = await GET(createRequest() as any);
    expect(res.status).toBe(404);
  });

  // ── Success ─────────────────────────────────────────────────

  it("returns ideas list with pagination metadata", async () => {
    const ideas = [
      { id: "idea-1", title: "Momentum Study", saved: false },
      { id: "idea-2", title: "Volatility Arb", saved: true },
    ];
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ data: ideas, count: 2 });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    const res = await GET(createRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ideas).toEqual(ideas);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it("returns empty array when no ideas exist", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ data: [], count: 0 });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    const res = await GET(createRequest() as any);
    const body = await res.json();
    expect(body.ideas).toEqual([]);
    expect(body.total).toBe(0);
  });

  // ── Pagination ──────────────────────────────────────────────

  it("passes pagination params to query", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ data: [], count: 0 });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    const res = await GET(createRequest({ page: "2", limit: "10" }) as any);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
  });

  it("clamps limit to max 50", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ data: [], count: 0 });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    const res = await GET(createRequest({ limit: "100" }) as any);
    const body = await res.json();
    expect(body.limit).toBe(50);
  });

  it("defaults page to 1 for invalid values", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ data: [], count: 0 });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    const res = await GET(createRequest({ page: "-5" }) as any);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  // ── Saved filter ────────────────────────────────────────────

  it("queries with saved filter when saved=true param", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ data: [], count: 0 });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    await GET(createRequest({ saved: "true" }) as any);

    // The chain should have eq called for saved=true (in addition to user_id eq)
    expect(ideasChain.eq).toHaveBeenCalledWith("saved", true);
  });

  // ── Query error ─────────────────────────────────────────────

  it("returns 500 when query fails", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const ideasChain = buildChain({ error: { message: "query error" } });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(ideasChain);

    const res = await GET(createRequest() as any);
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/kaggle/ideas", () => {
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
    return new Request("http://localhost/api/kaggle/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : "invalid{",
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(createRequest({ id: "uuid", saved: true }) as any);
    expect(res.status).toBe(401);
  });

  // ── User Resolution ────────────────────────────────────────

  it("returns 404 when user not found", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);

    const res = await PATCH(
      createRequest({ id: "550e8400-e29b-41d4-a716-446655440000", saved: true }) as any
    );
    expect(res.status).toBe(404);
  });

  // ── Input Validation ───────────────────────────────────────

  it("returns 400 for invalid JSON", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    mockFrom.mockReturnValue(userChain);

    const req = new Request("http://localhost/api/kaggle/ideas", {
      method: "PATCH",
      body: "{bad json",
    });
    const res = await PATCH(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is not a UUID", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    mockFrom.mockReturnValue(userChain);

    const res = await PATCH(createRequest({ id: "not-a-uuid", saved: true }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when saved is missing", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    mockFrom.mockReturnValue(userChain);

    const res = await PATCH(
      createRequest({ id: "550e8400-e29b-41d4-a716-446655440000" }) as any
    );
    expect(res.status).toBe(400);
  });

  // ── Success ─────────────────────────────────────────────────

  it("updates saved status and returns result", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ data: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await PATCH(
      createRequest({
        id: "550e8400-e29b-41d4-a716-446655440000",
        saved: true,
      }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(body.saved).toBe(true);
  });

  it("calls update with correct params", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ data: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    await PATCH(
      createRequest({
        id: "550e8400-e29b-41d4-a716-446655440000",
        saved: false,
      }) as any
    );

    expect(mockFrom).toHaveBeenCalledWith("kaggle_ideas");
    expect(updateChain.update).toHaveBeenCalledWith({ saved: false });
    expect(updateChain.eq).toHaveBeenCalledWith("id", "550e8400-e29b-41d4-a716-446655440000");
    expect(updateChain.eq).toHaveBeenCalledWith("user_id", "user-uuid-1");
  });

  // ── Update error ────────────────────────────────────────────

  it("returns 500 when update fails", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const updateChain = buildChain({ error: { message: "update error" } });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);

    const res = await PATCH(
      createRequest({
        id: "550e8400-e29b-41d4-a716-446655440000",
        saved: true,
      }) as any
    );
    expect(res.status).toBe(500);
  });
});
