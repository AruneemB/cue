"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, Sparkles, BookOpen, Dumbbell, ExternalLink } from "lucide-react";
import { RoadmapNode } from "@/components/modules/RoadmapNode";
import type { RoadmapNode as RoadmapNodeType } from "@/types/roadmap";
import type { MicroTask } from "@/types/ai";

interface NextSkillResponse {
  node: RoadmapNodeType | null;
  task: MicroTask | null;
  roadmap_name?: string;
  message?: string;
}

export default function RoadmapPage() {
  const [nextSkill, setNextSkill] = useState<NextSkillResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingNode, setUpdatingNode] = useState<string | null>(null);

  const fetchNextSkill = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/next-skill");
      if (res.status === 404) {
        const data = await res.json();
        setError(data.error ?? "No roadmap data found.");
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch roadmap (${res.status})`);
      const data: NextSkillResponse = await res.json();
      setNextSkill(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextSkill();
  }, [fetchNextSkill]);

  async function handleUpdate(nodeId: string, completionPct: number) {
    setUpdatingNode(nodeId);
    try {
      const res = await fetch("/api/roadmap/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: nodeId, completion_pct: completionPct }),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Log habit if advancing >=10%
      if (nextSkill?.node && completionPct - nextSkill.node.completion_pct >= 10) {
        await fetch("/api/habits/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "roadmap",
            source_id: nextSkill.node.name,
          }),
        });
      }

      // Refresh to get updated state + new micro-task
      await fetchNextSkill();
    } catch {
      // silent
    } finally {
      setUpdatingNode(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map size={24} />
          Roadmap
        </h1>
        <p className="text-sm text-foreground/50 mt-1">
          {nextSkill?.roadmap_name
            ? `Tracking: ${nextSkill.roadmap_name}`
            : "Your skill roadmap progress."}
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-foreground/10 p-8 text-center space-y-3">
          <p className="text-sm text-foreground/50">{error}</p>
          <p className="text-xs text-foreground/40">
            Go to Settings to import your Roadmap.sh profile or upload a roadmap JSON.
          </p>
        </div>
      )}

      {!loading && !error && nextSkill && (
        <div className="space-y-6">
          {/* Next skill node */}
          {nextSkill.node ? (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-foreground/60">Next Focus</h2>
              <RoadmapNode
                node={nextSkill.node}
                onUpdate={handleUpdate}
                updating={updatingNode === nextSkill.node.id}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-foreground/10 p-6 text-center">
              <p className="text-sm text-foreground/50">
                {nextSkill.message ?? "No in-progress skills found."}
              </p>
            </div>
          )}

          {/* AI-generated micro-task */}
          {nextSkill.task && (
            <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h2 className="text-sm font-semibold">Today&apos;s Micro-Task</h2>
                <span className="text-xs text-foreground/40">(~20 min)</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <BookOpen size={14} className="mt-0.5 shrink-0 text-foreground/40" />
                  <p className="text-foreground/70">{nextSkill.task.task_description}</p>
                </div>

                <div className="flex gap-2">
                  <Dumbbell size={14} className="mt-0.5 shrink-0 text-foreground/40" />
                  <p className="text-foreground/70">{nextSkill.task.hands_on_exercise}</p>
                </div>

                {nextSkill.task.resource_link && (
                  <a
                    href={nextSkill.task.resource_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                  >
                    Resource <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
