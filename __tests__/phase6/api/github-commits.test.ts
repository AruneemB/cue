import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

import { GET } from "@/app/api/github/commits/route";

describe("GET /api/github/commits", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost/api/github/commits");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return new Request(url.toString());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "ghp_test123", githubId: "12345" });
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no accessToken", async () => {
    mockAuth.mockResolvedValue({ githubId: "12345" });
    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    expect(res.status).toBe(401);
  });

  // ── Input Validation ───────────────────────────────────────

  it("returns 400 when repo param is missing", async () => {
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("repo");
  });

  it("returns 400 when repo param is not in owner/repo format", async () => {
    const res = await GET(createRequest({ repo: "invalid-no-slash" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("owner/repo");
  });

  // ── Success ─────────────────────────────────────────────────

  it("returns formatted commits on success", async () => {
    const githubCommits = [
      {
        sha: "abc1234567890",
        commit: {
          message: "Fix bug\n\nDetailed description",
          author: { name: "Test User", date: "2025-06-15T10:00:00Z" },
        },
        html_url: "https://github.com/user/repo/commit/abc1234567890",
      },
      {
        sha: "def9876543210",
        commit: {
          message: "Add feature",
          author: { name: "Test User", date: "2025-06-14T09:00:00Z" },
        },
        html_url: "https://github.com/user/repo/commit/def9876543210",
      },
    ];

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(githubCommits),
    } as unknown as Response);

    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.commits).toHaveLength(2);
    expect(body.commits[0]).toEqual({
      sha: "abc1234",
      message: "Fix bug",
      author: "Test User",
      date: "2025-06-15T10:00:00Z",
      url: "https://github.com/user/repo/commit/abc1234567890",
    });
  });

  it("truncates SHA to 7 characters", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          sha: "abc1234567890xyz",
          commit: {
            message: "Test",
            author: { name: "User", date: "2025-01-01T00:00:00Z" },
          },
          html_url: "https://github.com/user/repo/commit/abc1234567890xyz",
        },
      ]),
    } as unknown as Response);

    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    const body = await res.json();
    expect(body.commits[0].sha).toBe("abc1234");
  });

  it("takes only first line of multiline commit message", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          sha: "abc1234567890",
          commit: {
            message: "First line\nSecond line\nThird line",
            author: { name: "User", date: "2025-01-01T00:00:00Z" },
          },
          html_url: "https://github.com/user/repo/commit/abc1234567890",
        },
      ]),
    } as unknown as Response);

    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    const body = await res.json();
    expect(body.commits[0].message).toBe("First line");
  });

  it("calls GitHub API with correct URL and auth header", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    } as unknown as Response);

    await GET(createRequest({ repo: "user/my-repo" }) as any);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/repos/user/my-repo/commits?per_page=10",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_test123",
        }),
      })
    );
  });

  // ── Error handling ──────────────────────────────────────────

  it("returns 404 when GitHub returns 404", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const res = await GET(createRequest({ repo: "user/nonexistent" }) as any);
    expect(res.status).toBe(404);
  });

  it("returns 502 when GitHub returns non-404 error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    expect(res.status).toBe(502);
  });

  it("returns 502 on network failure", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const res = await GET(createRequest({ repo: "user/repo" }) as any);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch commits");
  });
});
