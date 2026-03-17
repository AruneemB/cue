import { describe, it, expect } from "vitest";
import { createMockRoadmapData } from "@/__tests__/helpers/mocks";
import type { RoadmapData } from "@/types/database";
import type { Roadmap } from "@/types/roadmap";

import {
  parseRoadmapData,
  getInProgressNodes,
  getNextSkillNode,
  updateNodeCompletion,
} from "@/lib/roadmap";

describe("parseRoadmapData", () => {
  it("maps completed goals to 'done' status", () => {
    const data = createMockRoadmapData();
    const roadmap = parseRoadmapData(data);
    const doneNode = roadmap.nodes.find((n) => n.name === "Learn React");
    expect(doneNode?.status).toBe("done");
    expect(doneNode?.completion_pct).toBe(100);
  });

  it("maps goals with targetDate to 'in-progress' status", () => {
    const data = createMockRoadmapData();
    const roadmap = parseRoadmapData(data);
    const inProgress = roadmap.nodes.find((n) => n.name === "Learn TypeScript");
    expect(inProgress?.status).toBe("in-progress");
    expect(inProgress?.completion_pct).toBe(40);
  });

  it("maps goals without targetDate or completed to 'not-started'", () => {
    const data = createMockRoadmapData();
    const roadmap = parseRoadmapData(data);
    const notStarted = roadmap.nodes.find((n) => n.name === "Learn Next.js");
    expect(notStarted?.status).toBe("not-started");
  });

  it("defaults completion_pct to 0 when missing", () => {
    const data = createMockRoadmapData();
    const roadmap = parseRoadmapData(data);
    const notStarted = roadmap.nodes.find((n) => n.name === "Learn Next.js");
    expect(notStarted?.completion_pct).toBe(0);
  });

  it("uses currentPhase as roadmap name", () => {
    const data = createMockRoadmapData({ currentPhase: "Phase 2" });
    const roadmap = parseRoadmapData(data);
    expect(roadmap.name).toBe("Phase 2");
  });

  it("defaults name to 'My Roadmap' when currentPhase is missing", () => {
    const data: RoadmapData = { goals: [] };
    const roadmap = parseRoadmapData(data);
    expect(roadmap.name).toBe("My Roadmap");
  });

  it("handles empty goals array", () => {
    const data: RoadmapData = { goals: [], currentPhase: "Empty" };
    const roadmap = parseRoadmapData(data);
    expect(roadmap.nodes).toHaveLength(0);
    expect(roadmap.name).toBe("Empty");
  });
});

describe("getInProgressNodes", () => {
  it("filters to in-progress nodes only", () => {
    const roadmap: Roadmap = {
      name: "Test",
      nodes: [
        { id: "1", name: "Done", status: "done", completion_pct: 100 },
        { id: "2", name: "IP 1", status: "in-progress", completion_pct: 50 },
        { id: "3", name: "NS", status: "not-started", completion_pct: 0 },
        { id: "4", name: "IP 2", status: "in-progress", completion_pct: 20 },
      ],
    };

    const result = getInProgressNodes(roadmap);
    expect(result).toHaveLength(2);
    expect(result.every((n) => n.status === "in-progress")).toBe(true);
  });

  it("sorts by completion_pct ascending", () => {
    const roadmap: Roadmap = {
      name: "Test",
      nodes: [
        { id: "1", name: "High", status: "in-progress", completion_pct: 80 },
        { id: "2", name: "Low", status: "in-progress", completion_pct: 10 },
        { id: "3", name: "Mid", status: "in-progress", completion_pct: 50 },
      ],
    };

    const result = getInProgressNodes(roadmap);
    expect(result[0].name).toBe("Low");
    expect(result[1].name).toBe("Mid");
    expect(result[2].name).toBe("High");
  });

  it("returns empty array when no in-progress nodes", () => {
    const roadmap: Roadmap = {
      name: "Test",
      nodes: [
        { id: "1", name: "Done", status: "done", completion_pct: 100 },
      ],
    };

    const result = getInProgressNodes(roadmap);
    expect(result).toHaveLength(0);
  });
});

describe("getNextSkillNode", () => {
  it("returns lowest-completion in-progress node", () => {
    const roadmap: Roadmap = {
      name: "Test",
      nodes: [
        { id: "1", name: "High", status: "in-progress", completion_pct: 80 },
        { id: "2", name: "Low", status: "in-progress", completion_pct: 10 },
      ],
    };

    const result = getNextSkillNode(roadmap);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Low");
  });

  it("returns null when no in-progress nodes", () => {
    const roadmap: Roadmap = {
      name: "Test",
      nodes: [
        { id: "1", name: "Done", status: "done", completion_pct: 100 },
        { id: "2", name: "NS", status: "not-started", completion_pct: 0 },
      ],
    };

    const result = getNextSkillNode(roadmap);
    expect(result).toBeNull();
  });
});

describe("updateNodeCompletion", () => {
  const baseRoadmap: Roadmap = {
    name: "Test",
    nodes: [
      { id: "1", name: "A", status: "in-progress", completion_pct: 30 },
      { id: "2", name: "B", status: "in-progress", completion_pct: 50 },
    ],
  };

  it("updates the correct node", () => {
    const result = updateNodeCompletion(baseRoadmap, "1", 60);
    expect(result.nodes.find((n) => n.id === "1")?.completion_pct).toBe(60);
  });

  it("clamps to max 100", () => {
    const result = updateNodeCompletion(baseRoadmap, "1", 150);
    expect(result.nodes.find((n) => n.id === "1")?.completion_pct).toBe(100);
  });

  it("clamps to min 0", () => {
    const result = updateNodeCompletion(baseRoadmap, "1", -10);
    expect(result.nodes.find((n) => n.id === "1")?.completion_pct).toBe(0);
  });

  it("sets status to 'done' at 100", () => {
    const result = updateNodeCompletion(baseRoadmap, "1", 100);
    expect(result.nodes.find((n) => n.id === "1")?.status).toBe("done");
  });

  it("returns a new object (immutability)", () => {
    const result = updateNodeCompletion(baseRoadmap, "1", 60);
    expect(result).not.toBe(baseRoadmap);
    expect(result.nodes).not.toBe(baseRoadmap.nodes);
  });

  it("does not modify original roadmap", () => {
    const original = JSON.parse(JSON.stringify(baseRoadmap));
    updateNodeCompletion(baseRoadmap, "1", 99);
    expect(baseRoadmap).toEqual(original);
  });

  it("leaves other nodes unchanged", () => {
    const result = updateNodeCompletion(baseRoadmap, "1", 60);
    const nodeB = result.nodes.find((n) => n.id === "2");
    expect(nodeB?.completion_pct).toBe(50);
    expect(nodeB?.status).toBe("in-progress");
  });
});
