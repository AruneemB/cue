import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFrom = vi.fn();
const mockGenerateQuantIdea = vi.fn();
const mockSampleTheme = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/ai", () => ({
  generateQuantIdea: (...args: unknown[]) => mockGenerateQuantIdea(...args),
  sampleTheme: (...args: unknown[]) => mockSampleTheme(...args),
}));

import { POST } from "@/app/api/kaggle/generate/route";

describe("POST /api/kaggle/generate", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single", "range"]) {
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
    return new Request("http://localhost/api/kaggle/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  const mockIdea = {
    title: "Momentum Factor Timing",
    hypothesis: "ML models can predict momentum regime changes",
    dataset: "CRSP daily returns",
    methodology: "Random forest on rolling features",
    eval_metric: "Sharpe ratio",
    difficulty: "intermediate",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345", accessToken: "ghp_test" });
    mockSampleTheme.mockReturnValue("momentum strategies");
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mockAuth.mockResolvedValue({ user: { name: "test" } });
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(401);
  });

  // ── User Resolution ────────────────────────────────────────

  it("returns 404 when user not found", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(404);
  });

  // ── Idea Generation ────────────────────────────────────────

  it("returns 502 when AI generation fails", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    mockFrom.mockReturnValue(userChain);
    mockGenerateQuantIdea.mockResolvedValue(null);

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Failed to generate");
  });

  it("uses provided theme when given", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ data: { id: "idea-1", ...mockIdea } });
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);
    mockGenerateQuantIdea.mockResolvedValue(mockIdea);

    await POST(createRequest({ theme: "volatility surface arbitrage" }) as any);

    expect(mockGenerateQuantIdea).toHaveBeenCalledWith("volatility surface arbitrage");
  });

  it("uses sampled theme when none provided", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ data: { id: "idea-1", ...mockIdea } });
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);
    mockGenerateQuantIdea.mockResolvedValue(mockIdea);

    await POST(createRequest({}) as any);

    expect(mockSampleTheme).toHaveBeenCalled();
    expect(mockGenerateQuantIdea).toHaveBeenCalledWith("momentum strategies");
  });

  // ── Database Persistence ───────────────────────────────────

  it("persists idea to kaggle_ideas table", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ data: { id: "idea-1", ...mockIdea } });
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);
    mockGenerateQuantIdea.mockResolvedValue(mockIdea);

    await POST(createRequest() as any);

    expect(mockFrom).toHaveBeenCalledWith("kaggle_ideas");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-uuid-1",
        title: mockIdea.title,
        hypothesis: mockIdea.hypothesis,
        dataset: mockIdea.dataset,
        methodology: mockIdea.methodology,
        eval_metric: mockIdea.eval_metric,
        difficulty: mockIdea.difficulty,
      })
    );
  });

  it("returns persisted: true on successful insert", async () => {
    const savedIdea = { id: "idea-uuid", ...mockIdea, saved: false };
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ data: savedIdea });
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);
    mockGenerateQuantIdea.mockResolvedValue(mockIdea);

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persisted).toBe(true);
    expect(body.idea).toEqual(savedIdea);
  });

  it("returns persisted: false when insert fails but still returns idea", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ error: { message: "insert error" } });
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);
    mockGenerateQuantIdea.mockResolvedValue(mockIdea);

    const res = await POST(createRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.persisted).toBe(false);
    expect(body.idea).toEqual(mockIdea);
  });

  // ── No body is fine ────────────────────────────────────────

  it("handles request with no body gracefully", async () => {
    const userChain = buildChain({ data: { id: "user-uuid-1" } });
    const insertChain = buildChain({ data: { id: "idea-1", ...mockIdea } });
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(insertChain);
    mockGenerateQuantIdea.mockResolvedValue(mockIdea);

    const req = new Request("http://localhost/api/kaggle/generate", {
      method: "POST",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });
});
