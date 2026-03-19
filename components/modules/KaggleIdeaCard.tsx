"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import type { KaggleIdea } from "@/types/database";

interface KaggleIdeaCardProps {
  idea: KaggleIdea;
  onToggleSave: (id: string, saved: boolean) => void;
  onStart: (id: string, title: string) => void;
}

const difficultyStyles: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-400",
  advanced: "bg-red-500/15 text-red-400",
};

export function KaggleIdeaCard({ idea, onToggleSave, onStart }: KaggleIdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const diffStyle = difficultyStyles[idea.difficulty ?? ""] ?? "bg-foreground/10 text-foreground/60";

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{idea.title}</h3>
          {idea.hypothesis && (
            <p className="text-xs text-foreground/50 mt-0.5 line-clamp-2">
              {idea.hypothesis}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {idea.difficulty && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diffStyle}`}>
              {idea.difficulty}
            </span>
          )}
          <button
            onClick={() => onToggleSave(idea.id, !idea.saved)}
            className="p-1 rounded hover:bg-foreground/5 transition-colors"
            title={idea.saved ? "Unsave" : "Save"}
          >
            <Bookmark
              size={16}
              className={idea.saved ? "fill-amber-400 text-amber-400" : "text-foreground/30"}
            />
          </button>
        </div>
      </div>

      {/* Tags */}
      {idea.tags && idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
      >
        {expanded ? "Less" : "More details"}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-foreground/5 pt-3 space-y-2 text-xs">
          {idea.dataset && (
            <div>
              <span className="font-medium text-foreground/70">Dataset:</span>{" "}
              <span className="text-foreground/50">{idea.dataset}</span>
            </div>
          )}
          {idea.methodology && (
            <div>
              <span className="font-medium text-foreground/70">Methodology:</span>{" "}
              <span className="text-foreground/50">{idea.methodology}</span>
            </div>
          )}
          {idea.eval_metric && (
            <div>
              <span className="font-medium text-foreground/70">Eval Metric:</span>{" "}
              <span className="text-foreground/50">{idea.eval_metric}</span>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div className="pt-1">
        <button
          onClick={() => onStart(idea.id, idea.title)}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Start Project (+40 XP)
        </button>
      </div>
    </div>
  );
}
