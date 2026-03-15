export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScoredRepo {
  repo: GitHubRepo;
  score: number;
  daysSinceLastPush: number;
}
