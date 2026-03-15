import type { RoadmapNode, Roadmap } from "@/types/roadmap";
import type { RoadmapData } from "@/types/database";

export function parseRoadmapData(data: RoadmapData): Roadmap {
  const nodes: RoadmapNode[] = data.goals.map((goal) => ({
    id: goal.id,
    name: goal.title,
    status: goal.completed
      ? "done"
      : goal.targetDate
        ? "in-progress"
        : "not-started",
    completion_pct: goal.completed ? 100 : 0,
  }));

  return {
    name: data.currentPhase ?? "My Roadmap",
    nodes,
  };
}

export function getInProgressNodes(roadmap: Roadmap): RoadmapNode[] {
  return roadmap.nodes
    .filter((node) => node.status === "in-progress")
    .sort((a, b) => a.completion_pct - b.completion_pct);
}

export function getNextSkillNode(roadmap: Roadmap): RoadmapNode | null {
  const inProgress = getInProgressNodes(roadmap);
  return inProgress[0] ?? null;
}

export function updateNodeCompletion(
  roadmap: Roadmap,
  nodeId: string,
  completionPct: number
): Roadmap {
  return {
    ...roadmap,
    nodes: roadmap.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      const clamped = Math.min(100, Math.max(0, completionPct));
      return {
        ...node,
        completion_pct: clamped,
        status: clamped >= 100 ? "done" : node.status,
      };
    }),
  };
}
