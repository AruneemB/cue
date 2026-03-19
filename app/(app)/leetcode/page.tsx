"use client";

import { useEffect, useState } from "react";
import { Code2, RefreshCw } from "lucide-react";
import { LeetCodeCard } from "@/components/modules/LeetCodeCard";
import type { DailyChallenge } from "@/types/leetcode";

export default function LeetCodePage() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);
  const [solved, setSolved] = useState(false);

  async function fetchDaily() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leetcode/daily");
      if (!res.ok) throw new Error(`Failed to fetch daily problem (${res.status})`);
      const data = await res.json();
      setChallenge(data.challenge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily problem");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDaily();
  }, []);

  async function handleMarkSolved() {
    if (!challenge) return;
    setSolving(true);
    try {
      const res = await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "leetcode",
          source_id: challenge.question.title,
        }),
      });
      if (res.ok) setSolved(true);
    } catch {
      // silent
    } finally {
      setSolving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code2 size={24} />
            LeetCode
          </h1>
          <p className="text-sm text-foreground/50 mt-1">
            Today&apos;s problem of the day.
          </p>
        </div>
        <button
          onClick={fetchDaily}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-1.5 text-xs text-foreground/60 hover:bg-foreground/5 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      )}

      {error && (
        <div className="rounded-xl border border-foreground/10 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-foreground/40 mt-2">
            The LeetCode API may be temporarily unavailable. Try again later.
          </p>
        </div>
      )}

      {!loading && !error && !challenge && (
        <div className="rounded-xl border border-foreground/10 p-8 text-center">
          <p className="text-sm text-foreground/50">
            No daily problem available right now.
          </p>
        </div>
      )}

      {!loading && !error && challenge && (
        <div className="max-w-xl">
          <LeetCodeCard
            challenge={challenge}
            onMarkSolved={handleMarkSolved}
            solving={solving}
            solved={solved}
          />
        </div>
      )}
    </div>
  );
}
