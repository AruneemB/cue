import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFrom = vi.fn();
const mockParseRoadmapData = vi.fn();
const mockUpdateNodeCompletion = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/roadmap", () => ({
  parseRoadmapData: (...args: unknown[]) => mockParseRoadmapData(...args),
  updateNodeCompletion: (...args: unknown[]) => mockUpdateNodeCompletion(...args),
}));

import { POST } from "@/app/api/roadmap/update/route";

describe("POST /api/roadmap/update", () => {
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
    return new Request("http://localhost/api/roadmap/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : "invalid{",
    });
  }

  const mockRoadmap = {
    name: "Frontend Mastery",
    nodes: [
      { id: "goal-1", name: "Learn TypeScript", status: "in-progress", completion_pct: 40 },
      { id: "goal-2", name: "Learn React", status: "done", completion_pct: 100 },
    ],
  };

  const updatedRoadmap = {
    name: "Frontend Mastery",
    nodes: [
      { id: "goal-1", name: "Learn TypeScript", status: "in-progress", completion_pct: 70 },
      { id: "goal-2", name: "Learn React", status: "done", completion_pct: 100 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 50 }) as any);
    expect(res.status).toBe(401);
  });

  // ── Input Validation ───────────────────────────────────────

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/roadmap/update", {
      method: "POST",
      body: "{{bad json",
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when node_id is missing", async () => {
    const res = await POST(createRequest({ completion_pct: 50 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when completion_pct is missing", async () => {
    const res = await POST(createRequest({ node_id: "goal-1" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when completion_pct is below 0", async () => {
    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: -1 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when completion_pct is above 100", async () => {
    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 101 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when completion_pct is not an integer", async () => {
    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 50.5 }) as any);
    expect(res.status).toBe(400);
  });

  // ── User Resolution ────────────────────────────────────────

  it("returns 404 when user not found", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);

    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 50 }) as any);
    expect(res.status).toBe(404);
  });

  it("returns 404 when user has no roadmap_data", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: null },
    });
    mockFrom.mockReturnValue(userChain);

    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 50 }) as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("No roadmap data");
  });

  // ── Node Not Found ─────────────────────────────────────────

  it("returns 404 when node_id does not exist in roadmap", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    mockFrom.mockReturnValue(userChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);

    const res = await POST(createRequest({ node_id: "nonexistent", completion_pct: 50 }) as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Node not found");
  });

  // ── Success ─────────────────────────────────────────────────

  it("updates node completion and persists to DB", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    const updateChain = buildChain({ data: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockUpdateNodeCompletion.mockReturnValue(updatedRoadmap);

    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 70 }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node.id).toBe("goal-1");
    expect(body.node.completion_pct).toBe(70);
  });

  it("calls updateNodeCompletion with correct args", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    const updateChain = buildChain({ data: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockUpdateNodeCompletion.mockReturnValue(updatedRoadmap);

    await POST(createRequest({ node_id: "goal-1", completion_pct: 70 }) as any);

    expect(mockUpdateNodeCompletion).toHaveBeenCalledWith(mockRoadmap, "goal-1", 70);
  });

  it("persists updated roadmap_data to users table", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    const updateChain = buildChain({ data: null });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockUpdateNodeCompletion.mockReturnValue(updatedRoadmap);

    await POST(createRequest({ node_id: "goal-1", completion_pct: 70 }) as any);

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        roadmap_data: expect.objectContaining({
          currentPhase: "Frontend Mastery",
          goals: expect.arrayContaining([
            expect.objectContaining({ id: "goal-1", completion_pct: 70 }),
          ]),
        }),
      })
    );
  });

  it("accepts boundary value completion_pct=0", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    const updateChain = buildChain({ data: null });

    const zeroRoadmap = {
      ...updatedRoadmap,
      nodes: [
        { id: "goal-1", name: "Learn TypeScript", status: "in-progress", completion_pct: 0 },
        ...updatedRoadmap.nodes.slice(1),
      ],
    };
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockUpdateNodeCompletion.mockReturnValue(zeroRoadmap);

    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 0 }) as any);
    expect(res.status).toBe(200);
  });

  it("accepts boundary value completion_pct=100", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    const updateChain = buildChain({ data: null });

    const doneRoadmap = {
      ...updatedRoadmap,
      nodes: [
        { id: "goal-1", name: "Learn TypeScript", status: "done", completion_pct: 100 },
        ...updatedRoadmap.nodes.slice(1),
      ],
    };
    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockUpdateNodeCompletion.mockReturnValue(doneRoadmap);

    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 100 }) as any);
    expect(res.status).toBe(200);
  });

  // ── DB Update Error ─────────────────────────────────────────

  it("returns 500 when DB update fails", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    const updateChain = buildChain({ error: { message: "update error" } });

    mockFrom.mockReturnValueOnce(userChain).mockReturnValueOnce(updateChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockUpdateNodeCompletion.mockReturnValue(updatedRoadmap);

    const res = await POST(createRequest({ node_id: "goal-1", completion_pct: 70 }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to update roadmap");
  });
});
