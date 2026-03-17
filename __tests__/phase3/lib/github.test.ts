import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockRepo, createMockFetchResponse } from "@/__tests__/helpers/mocks";

import {
  scoreRepo,
  fetchUserRepos,
  getTopScoredRepos,
  getRepoToNudge,
} from "@/lib/github";

describe("scoreRepo", () => {
  it("calculates score as daysSinceLastPush * languageWeight * (1 + open_issues * 0.1)", () => {
    const repo = createMockRepo({
      language: "TypeScript",
      open_issues_count: 0,
      pushed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const result = scoreRepo(repo);
    // 10 days * 1.2 (TS weight) * (1 + 0) = 12
    expect(result.score).toBe(10 * 1.2 * 1);
    expect(result.daysSinceLastPush).toBe(10);
  });

  it("applies minimum 1-day floor", () => {
    const repo = createMockRepo({
      language: "TypeScript",
      open_issues_count: 0,
      pushed_at: new Date().toISOString(), // just pushed
    });
    const result = scoreRepo(repo);
    // floor(0) → 1 day minimum
    expect(result.daysSinceLastPush).toBe(1);
    expect(result.score).toBe(1.2);
  });

  it("applies correct language weights", () => {
    const weights: Record<string, number> = {
      Rust: 1.4,
      Python: 1.3,
      Go: 1.3,
      TypeScript: 1.2,
    };

    for (const [lang, weight] of Object.entries(weights)) {
      const repo = createMockRepo({
        language: lang,
        open_issues_count: 0,
        pushed_at: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
      const result = scoreRepo(repo);
      expect(result.score).toBeCloseTo(1 * weight * 1, 5);
    }
  });

  it("uses 1.0 weight for unknown languages", () => {
    const repo = createMockRepo({
      language: "Brainfuck",
      open_issues_count: 0,
      pushed_at: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    const result = scoreRepo(repo);
    expect(result.score).toBe(2 * 1.0 * 1);
  });

  it("handles null language with weight 1.0", () => {
    const repo = createMockRepo({
      language: null,
      open_issues_count: 0,
      pushed_at: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    const result = scoreRepo(repo);
    expect(result.score).toBe(3 * 1.0 * 1);
  });

  it("factors in open_issues_count", () => {
    const repo = createMockRepo({
      language: null,
      open_issues_count: 10,
      pushed_at: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    const result = scoreRepo(repo);
    // 5 * 1.0 * (1 + 10 * 0.1) = 5 * 2 = 10
    expect(result.score).toBe(10);
  });
});

describe("fetchUserRepos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls correct API URL with headers", async () => {
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse([])
    );

    await fetchUserRepos("ghp_token");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/user/repos?sort=pushed&per_page=20",
      {
        headers: {
          Authorization: "Bearer ghp_token",
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
  });

  it("filters out forks", async () => {
    const repos = [
      createMockRepo({
        id: 1,
        name: "my-repo",
        fork: false,
        pushed_at: new Date(
          Date.now() - 3 * 60 * 60 * 1000
        ).toISOString(),
      }),
      createMockRepo({
        id: 2,
        name: "forked-repo",
        fork: true,
        pushed_at: new Date(
          Date.now() - 3 * 60 * 60 * 1000
        ).toISOString(),
      }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse(repos)
    );

    const result = await fetchUserRepos("token");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("my-repo");
  });

  it("filters out archived repos", async () => {
    const repos = [
      createMockRepo({
        id: 1,
        archived: true,
        pushed_at: new Date(
          Date.now() - 3 * 60 * 60 * 1000
        ).toISOString(),
      }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse(repos)
    );

    const result = await fetchUserRepos("token");
    expect(result).toHaveLength(0);
  });

  it("filters out repos pushed less than 2 hours ago", async () => {
    const repos = [
      createMockRepo({
        id: 1,
        name: "recent",
        pushed_at: new Date(
          Date.now() - 1 * 60 * 60 * 1000
        ).toISOString(), // 1h ago
      }),
      createMockRepo({
        id: 2,
        name: "old",
        pushed_at: new Date(
          Date.now() - 3 * 60 * 60 * 1000
        ).toISOString(), // 3h ago
      }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse(repos)
    );

    const result = await fetchUserRepos("token");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("old");
  });

  it("throws on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({ message: "Bad" }, { status: 401, ok: false })
    );

    await expect(fetchUserRepos("bad-token")).rejects.toThrow(
      "GitHub API responded with 401"
    );
  });
});

describe("getTopScoredRepos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns repos sorted descending by score", async () => {
    const repos = [
      createMockRepo({
        id: 1,
        name: "low",
        language: null,
        open_issues_count: 0,
        pushed_at: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }),
      createMockRepo({
        id: 2,
        name: "high",
        language: "Rust",
        open_issues_count: 5,
        pushed_at: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse(repos)
    );

    const result = await getTopScoredRepos("token");
    expect(result.length).toBe(2);
    expect(result[0].score).toBeGreaterThan(result[1].score);
    expect(result[0].repo.name).toBe("high");
  });

  it("returns empty array when no repos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse([])
    );

    const result = await getTopScoredRepos("token");
    expect(result).toEqual([]);
  });
});

describe("getRepoToNudge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the highest-scored repo", async () => {
    const repos = [
      createMockRepo({
        id: 1,
        name: "winner",
        language: "Rust",
        open_issues_count: 10,
        pushed_at: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }),
      createMockRepo({
        id: 2,
        name: "loser",
        language: null,
        open_issues_count: 0,
        pushed_at: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse(repos)
    );

    const result = await getRepoToNudge("token");
    expect(result).not.toBeNull();
    expect(result!.repo.name).toBe("winner");
  });

  it("returns null when no repos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse([])
    );

    const result = await getRepoToNudge("token");
    expect(result).toBeNull();
  });
});
