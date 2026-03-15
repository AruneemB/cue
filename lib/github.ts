import type { GitHubRepo } from "@/types/github";

const GITHUB_API = "https://api.github.com";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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
