"use client";

import { ExternalLink } from "lucide-react";
import type { DailyChallenge } from "@/types/leetcode";

interface LeetCodeCardProps {
  challenge: DailyChallenge;
  onMarkSolved: () => void;
  solving?: boolean;
  solved?: boolean;
}

const difficultyStyles: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-400",
  Medium: "bg-amber-500/15 text-amber-400",
  Hard: "bg-red-500/15 text-red-400",
};

export function LeetCodeCard({
  challenge,
  onMarkSolved,
  solving,
  solved,
}: LeetCodeCardProps) {
  const { question, link, date } = challenge;
  const diffStyle = difficultyStyles[question.difficulty] ?? "bg-foreground/10 text-foreground/60";

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs text-foreground/40">{date}</span>
          <h3 className="text-lg font-semibold mt-0.5">{question.title}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${diffStyle}`}>
          {question.difficulty}
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/50">
        <span>
          Acceptance: <strong className="text-foreground/70">{question.acRate.toFixed(1)}%</strong>
        </span>
      </div>

      {/* Tags */}
      {question.topicTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.topicTags.map((tag) => (
            <span
              key={tag.name}
              className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <a
          href={`https://leetcode.com${link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors"
        >
          Open on LeetCode <ExternalLink size={12} />
        </a>
        <button
          onClick={onMarkSolved}
          disabled={solving || solved}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            solved
              ? "bg-emerald-600/20 text-emerald-400 cursor-default"
              : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          }`}
        >
          {solved ? "Solved" : solving ? "Logging..." : "Mark Solved (+50 XP)"}
        </button>
      </div>
    </div>
  );
}
