"use client";

import { useEffect, useState } from "react";
import { Github, RefreshCw } from "lucide-react";
import { GithubRepoCard } from "@/components/modules/GithubRepoCard";
import type { ScoredRepo } from "@/types/github";

export default function GithubPage() {
  const [repos, setRepos] = useState<ScoredRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingRepo, setLoggingRepo] = useState<string | null>(null);

  async function fetchRepos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) throw new Error(`Failed to fetch repos (${res.status})`);
      const data = await res.json();
      setRepos(data.repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRepos();
  }, []);

  async function handleLog(repoName: string) {
    setLoggingRepo(repoName);
    try {
      const res = await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "github", source_id: repoName }),
      });
      if (!res.ok) throw new Error("Failed to log activity");
    } catch {
      // silent — not critical
    } finally {
      setLoggingRepo(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Github size={24} />
            GitHub
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            Your repos ranked by how urgently they need attention.
          </p>
        </div>
        <button
          onClick={fetchRepos}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && repos.length === 0 && (
        <div className="rounded-xl border border-foreground/10 p-8 text-center">
          <p className="text-sm text-foreground/50">
            No repos found. All your repositories have been pushed to recently — nice work!
          </p>
        </div>
      )}

      {!loading && !error && repos.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {repos.map((scored) => (
            <GithubRepoCard
              key={scored.repo.id}
              scored={scored}
              onLog={handleLog}
              logging={loggingRepo === scored.repo.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
