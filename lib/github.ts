import type { GitHubRepo, ScoredRepo } from "@/types/github";

const GITHUB_API = "https://api.github.com";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LANGUAGE_WEIGHTS: Record<string, number> = {
  TypeScript: 1.2,
  JavaScript: 1.1,
  Python: 1.3,
  Rust: 1.4,
  Go: 1.3,
  Java: 1.1,
  "C++": 1.2,
  C: 1.2,
  Ruby: 1.1,
  Swift: 1.2,
  Kotlin: 1.2,
};

export async function fetchUserRepos(
  token: string
): Promise<GitHubRepo[]> {
  const res = await fetch(`${GITHUB_API}/user/repos?sort=pushed&per_page=20`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    console.error("GitHub API error:", res.status, await res.text());
    throw new Error(`GitHub API responded with ${res.status}`);
  }

  const repos: GitHubRepo[] = await res.json();

  const now = Date.now();
  return repos.filter(
    (repo) =>
      !repo.fork &&
      !repo.archived &&
      now - new Date(repo.pushed_at).getTime() > TWO_HOURS_MS
  );
}

export function scoreRepo(repo: GitHubRepo): ScoredRepo {
  const daysSinceLastPush = Math.max(
    1,
    Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / MS_PER_DAY)
  );
  const languageWeight = LANGUAGE_WEIGHTS[repo.language ?? ""] ?? 1.0;
  const score =
    daysSinceLastPush * languageWeight * (1 + repo.open_issues_count * 0.1);

  return { repo, score, daysSinceLastPush };
}

export async function getTopScoredRepos(
  token: string
): Promise<ScoredRepo[]> {
  const repos = await fetchUserRepos(token);
  return repos.map(scoreRepo).sort((a, b) => b.score - a.score);
}

export async function getRepoToNudge(
  token: string
): Promise<ScoredRepo | null> {
  const scored = await getTopScoredRepos(token);
  return scored[0] ?? null;
}
