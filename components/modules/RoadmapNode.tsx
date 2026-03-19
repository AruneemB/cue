"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { RoadmapNode as RoadmapNodeType } from "@/types/roadmap";

interface RoadmapNodeProps {
  node: RoadmapNodeType;
  onUpdate: (nodeId: string, completionPct: number) => void;
  updating?: boolean;
}

const statusConfig = {
  done: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    label: "Done",
  },
  "in-progress": {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    label: "In Progress",
  },
  "not-started": {
    icon: Circle,
    color: "text-foreground/30",
    bg: "bg-foreground/5",
    label: "Not Started",
  },
} as const;

export function RoadmapNode({ node, onUpdate, updating }: RoadmapNodeProps) {
  const [sliderValue, setSliderValue] = useState(node.completion_pct);
  const config = statusConfig[node.status];
  const Icon = config.icon;

  const hasChanged = sliderValue !== node.completion_pct;

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={18} className={config.color} />
          <span className="text-sm font-semibold truncate">{node.name}</span>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-foreground/50">
          <span>Progress</span>
          <span className="font-mono">{sliderValue}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${sliderValue}%` }}
          />
        </div>
      </div>

      {/* Slider + update */}
      {node.status !== "done" && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="flex-1 h-1.5 appearance-none rounded-full bg-foreground/10 accent-emerald-500 cursor-pointer"
          />
          {hasChanged && (
            <button
              onClick={() => onUpdate(node.id, sliderValue)}
              disabled={updating}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {updating ? "Saving..." : "Update"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
