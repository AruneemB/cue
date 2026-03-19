"use client";

import { useEffect, useState, useCallback } from "react";
import { FlaskConical, Sparkles, Bookmark } from "lucide-react";
import { KaggleIdeaCard } from "@/components/modules/KaggleIdeaCard";
import type { KaggleIdea } from "@/types/database";

export default function KagglePage() {
  const [ideas, setIdeas] = useState<KaggleIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (showSavedOnly) params.set("saved", "true");
      const res = await fetch(`/api/kaggle/ideas?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch ideas (${res.status})`);
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ideas");
    } finally {
      setLoading(false);
    }
  }, [showSavedOnly]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/kaggle/generate", { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      // Refresh the list after generating
      await fetchIdeas();
    } catch {
      setError("Failed to generate idea. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleSave(id: string, saved: boolean) {
    // Optimistic update
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, saved } : idea))
    );

    try {
      // Use supabase directly would require browser client — use a PATCH-style approach
      // For now, toggle via a simple fetch (we'll update the ideas route to support PATCH later)
      // Actually, let's just refetch after toggling
      await fetch("/api/kaggle/ideas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, saved }),
      });
    } catch {
      // Revert on failure
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === id ? { ...idea, saved: !saved } : idea))
      );
    }
  }

  async function handleStart(id: string, title: string) {
    try {
      await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "kaggle", source_id: title }),
      });
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical size={24} />
            Kaggle
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            AI-generated quant research project ideas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              showSavedOnly
                ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                : "border-foreground/10 text-foreground/60 hover:bg-foreground/5"
            }`}
          >
            <Bookmark size={14} />
            Saved
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Sparkles size={14} className={generating ? "animate-pulse" : ""} />
            {generating ? "Generating..." : "Generate Idea"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && ideas.length === 0 && (
        <div className="rounded-xl border border-foreground/10 p-8 text-center">
          <p className="text-sm text-foreground/50">
            {showSavedOnly
              ? "No saved ideas yet. Generate some and bookmark your favorites!"
              : "No ideas generated yet. Click \"Generate Idea\" to get started."}
          </p>
        </div>
      )}

      {!loading && !error && ideas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {ideas.map((idea) => (
            <KaggleIdeaCard
              key={idea.id}
              idea={idea}
              onToggleSave={handleToggleSave}
              onStart={handleStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
