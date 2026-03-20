"use client";

import { useState } from "react";
import {
  Star,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ScoredRepo } from "@/types/github";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface GithubRepoCardProps {
  scored: ScoredRepo;
  onLog: (repoName: string) => void;
  logging?: boolean;
}

export function GithubRepoCard({ scored, onLog, logging }: GithubRepoCardProps) {
  const { repo, score, daysSinceLastPush } = scored;
  const [expanded, setExpanded] = useState(false);
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [loadingCommits, setLoadingCommits] = useState(false);

  async function toggleCommits() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    if (commits) return;

    setLoadingCommits(true);
    try {
      const res = await fetch(
        `/api/github/commits?repo=${encodeURIComponent(repo.full_name)}`
      );
      if (res.ok) {
        const data = await res.json();
        setCommits(data.commits);
      }
    } catch {
      // silently fail — commits are supplementary
    } finally {
      setLoadingCommits(false);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return "just now";
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `${diffD}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const urgencyColor =
    daysSinceLastPush >= 14
      ? "text-red-400"
      : daysSinceLastPush >= 7
        ? "text-amber-400"
        : "text-foreground/50";

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:underline inline-flex items-center gap-1"
          >
            {repo.name}
            <ExternalLink size={12} className="opacity-50" />
          </a>
          {repo.description && (
            <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">
              {repo.description}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-mono text-foreground/40">
          {score.toFixed(1)} pts
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star size={12} /> {repo.stargazers_count}
        </span>
        {repo.open_issues_count > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle size={12} /> {repo.open_issues_count}
          </span>
        )}
        <span className={`flex items-center gap-1 ${urgencyColor}`}>
          <Clock size={12} /> {daysSinceLastPush}d idle
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onLog(repo.name)}
          disabled={logging}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {logging ? "Logging..." : "Log Commit"}
        </button>
        <button
          onClick={toggleCommits}
          className="flex items-center gap-1 rounded-md border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors"
        >
          Recent commits
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Expandable commit list */}
      {expanded && (
        <div className="border-t border-foreground/5 pt-3 space-y-2">
          {loadingCommits && (
            <div className="h-16 animate-pulse rounded bg-muted" />
          )}
          {commits && commits.length === 0 && (
            <p className="text-xs text-foreground/40">No recent commits.</p>
          )}
          {commits?.map((c) => (
            <a
              key={c.sha}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md px-2 py-1.5 hover:bg-foreground/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs">
                <code className="text-foreground/40 font-mono">{c.sha}</code>
                <span className="text-foreground/70 truncate">{c.message}</span>
                <span className="ml-auto shrink-0 text-foreground/30">
                  {formatDate(c.date)}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
