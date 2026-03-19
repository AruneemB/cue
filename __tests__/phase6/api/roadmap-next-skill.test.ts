import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFrom = vi.fn();
const mockParseRoadmapData = vi.fn();
const mockGetNextSkillNode = vi.fn();
const mockGenerateMicroTask = vi.fn();

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
  getNextSkillNode: (...args: unknown[]) => mockGetNextSkillNode(...args),
}));

vi.mock("@/lib/ai", () => ({
  generateMicroTask: (...args: unknown[]) => mockGenerateMicroTask(...args),
}));

import { GET } from "@/app/api/roadmap/next-skill/route";

describe("GET /api/roadmap/next-skill", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    });
    return chain;
  }

  const mockNode = {
    id: "goal-1",
    name: "Learn TypeScript",
    status: "in-progress",
    completion_pct: 40,
  };

  const mockTask = {
    task_description: "Build a type-safe API",
    resource_link: "https://typescriptlang.org/docs",
    hands_on_exercise: "Create interfaces for a REST API",
  };

  const mockRoadmap = {
    name: "Frontend Mastery",
    nodes: [mockNode],
  };

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

  it("returns 404 when user not found", async () => {
    const userChain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(userChain);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  // ── No Roadmap Data ────────────────────────────────────────

  it("returns 404 when user has no roadmap_data", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: null },
    });
    mockFrom.mockReturnValue(userChain);

    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("No roadmap data");
  });

  // ── No In-Progress Nodes ───────────────────────────────────

  it("returns null node when no in-progress skills", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    mockFrom.mockReturnValue(userChain);
    mockParseRoadmapData.mockReturnValue({ name: "My Roadmap", nodes: [] });
    mockGetNextSkillNode.mockReturnValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node).toBeNull();
    expect(body.task).toBeNull();
    expect(body.message).toBeTruthy();
  });

  // ── Success with Node + Micro-Task ─────────────────────────

  it("returns next node and generated micro-task", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [], currentPhase: "Frontend Mastery" } },
    });
    mockFrom.mockReturnValue(userChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockGetNextSkillNode.mockReturnValue(mockNode);
    mockGenerateMicroTask.mockResolvedValue(mockTask);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node).toEqual(mockNode);
    expect(body.task).toEqual(mockTask);
    expect(body.roadmap_name).toBe("Frontend Mastery");
  });

  it("calls generateMicroTask with node name and roadmap name", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    mockFrom.mockReturnValue(userChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockGetNextSkillNode.mockReturnValue(mockNode);
    mockGenerateMicroTask.mockResolvedValue(mockTask);

    await GET();

    expect(mockGenerateMicroTask).toHaveBeenCalledWith("Learn TypeScript", "Frontend Mastery");
  });

  it("returns null task when AI generation fails", async () => {
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: { goals: [] } },
    });
    mockFrom.mockReturnValue(userChain);
    mockParseRoadmapData.mockReturnValue(mockRoadmap);
    mockGetNextSkillNode.mockReturnValue(mockNode);
    mockGenerateMicroTask.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.node).toEqual(mockNode);
    expect(body.task).toBeNull();
  });

  it("passes roadmap_data to parseRoadmapData", async () => {
    const roadmapData = {
      goals: [{ id: "g1", title: "TS", completed: false }],
      currentPhase: "Learning",
    };
    const userChain = buildChain({
      data: { id: "user-uuid-1", roadmap_data: roadmapData },
    });
    mockFrom.mockReturnValue(userChain);
    mockParseRoadmapData.mockReturnValue({ name: "Learning", nodes: [] });
    mockGetNextSkillNode.mockReturnValue(null);

    await GET();

    expect(mockParseRoadmapData).toHaveBeenCalledWith(roadmapData);
  });
});
