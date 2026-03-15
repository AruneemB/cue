export type NodeStatus = "done" | "in-progress" | "not-started";

export interface RoadmapNode {
  id: string;
  name: string;
  status: NodeStatus;
  completion_pct: number;
}

export interface Roadmap {
  name: string;
  nodes: RoadmapNode[];
}
