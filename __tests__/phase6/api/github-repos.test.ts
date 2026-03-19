import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockGetTopScoredRepos = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/github", () => ({
  getTopScoredRepos: (...args: unknown[]) => mockGetTopScoredRepos(...args),
}));

import { GET } from "@/app/api/github/repos/route";

describe("GET /api/github/repos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "ghp_test123", githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no accessToken", async () => {
    mockAuth.mockResolvedValue({ githubId: "12345" });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  // ── Success ─────────────────────────────────────────────────

  it("returns scored repos on success", async () => {
    const repos = [
      {
        repo: {
          id: 1,
          name: "my-repo",
          full_name: "user/my-repo",
          html_url: "https://github.com/user/my-repo",
          description: "A repo",
          language: "TypeScript",
          stargazers_count: 5,
          open_issues_count: 1,
          pushed_at: "2025-01-01T00:00:00Z",
        },
        score: 12.5,
        daysSinceLastPush: 10,
      },
    ];
    mockGetTopScoredRepos.mockResolvedValue(repos);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.repos).toEqual(repos);
  });

  it("passes the accessToken to getTopScoredRepos", async () => {
    mockGetTopScoredRepos.mockResolvedValue([]);

    await GET();

    expect(mockGetTopScoredRepos).toHaveBeenCalledWith("ghp_test123");
  });

  it("returns empty array when no repos need attention", async () => {
    mockGetTopScoredRepos.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.repos).toEqual([]);
  });

  // ── Error handling ──────────────────────────────────────────

  it("returns 502 when GitHub API fails", async () => {
    mockGetTopScoredRepos.mockRejectedValue(new Error("GitHub API responded with 403"));

    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch repositories");
  });

  it("returns 502 on network error", async () => {
    mockGetTopScoredRepos.mockRejectedValue(new Error("fetch failed"));

    const res = await GET();
    expect(res.status).toBe(502);
  });
});
