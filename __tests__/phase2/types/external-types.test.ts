import { describe, it, expect } from "vitest";
import type { GitHubRepo, ScoredRepo } from "@/types/github";
import type { DailyChallenge, LeetCodeQuestion } from "@/types/leetcode";
import type { RoadmapNode, Roadmap, NodeStatus } from "@/types/roadmap";
import type { QuantIdea, MicroTask } from "@/types/ai";

describe("GitHub types", () => {
  it("GitHubRepo has all required fields", () => {
    const repo: GitHubRepo = {
      id: 1,
      name: "test-repo",
      full_name: "user/test-repo",
      html_url: "https://github.com/user/test-repo",
      description: "A test repo",
      fork: false,
      archived: false,
      language: "TypeScript",
      stargazers_count: 10,
      open_issues_count: 3,
      pushed_at: "2024-01-01T00:00:00Z",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(repo.name).toBe("test-repo");
    expect(repo.fork).toBe(false);
  });

  it("GitHubRepo allows null description and language", () => {
    const repo: GitHubRepo = {
      id: 2,
      name: "no-desc",
      full_name: "user/no-desc",
      html_url: "https://github.com/user/no-desc",
      description: null,
      fork: false,
      archived: false,
      language: null,
      stargazers_count: 0,
      open_issues_count: 0,
      pushed_at: "2024-01-01T00:00:00Z",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(repo.description).toBeNull();
    expect(repo.language).toBeNull();
  });

  it("ScoredRepo contains repo, score, and daysSinceLastPush", () => {
    const scored: ScoredRepo = {
      repo: {
        id: 1,
        name: "test",
        full_name: "u/test",
        html_url: "https://github.com/u/test",
        description: null,
        fork: false,
        archived: false,
        language: "Rust",
        stargazers_count: 0,
        open_issues_count: 0,
        pushed_at: "2024-01-01T00:00:00Z",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      score: 15.5,
      daysSinceLastPush: 10,
    };
    expect(scored.score).toBe(15.5);
    expect(scored.daysSinceLastPush).toBe(10);
  });
});

describe("LeetCode types", () => {
  it("DailyChallenge has date, link, and question", () => {
    const challenge: DailyChallenge = {
      date: "2025-01-15",
      link: "/problems/two-sum",
      question: {
        title: "Two Sum",
        difficulty: "Easy",
        acRate: 49.5,
        topicTags: [{ name: "Array" }, { name: "Hash Table" }],
      },
    };
    expect(challenge.date).toBe("2025-01-15");
    expect(challenge.question.topicTags).toHaveLength(2);
  });

  it("LeetCodeQuestion supports empty topicTags", () => {
    const q: LeetCodeQuestion = {
      title: "No Tags",
      difficulty: "Hard",
      acRate: 10.0,
      topicTags: [],
    };
    expect(q.topicTags).toHaveLength(0);
  });
});

describe("Roadmap types", () => {
  it("RoadmapNode has required fields", () => {
    const node: RoadmapNode = {
      id: "node-1",
      name: "Learn TS",
      status: "in-progress",
      completion_pct: 40,
    };
    expect(node.status).toBe("in-progress");
    expect(node.completion_pct).toBe(40);
  });

  it("NodeStatus covers all three values", () => {
    const statuses: NodeStatus[] = ["done", "in-progress", "not-started"];
    expect(statuses).toHaveLength(3);
  });

  it("Roadmap has name and nodes", () => {
    const roadmap: Roadmap = {
      name: "Frontend Mastery",
      nodes: [
        { id: "1", name: "React", status: "done", completion_pct: 100 },
        { id: "2", name: "Next.js", status: "in-progress", completion_pct: 30 },
      ],
    };
    expect(roadmap.name).toBe("Frontend Mastery");
    expect(roadmap.nodes).toHaveLength(2);
  });
});

describe("AI types", () => {
  it("QuantIdea has all required fields", () => {
    const idea: QuantIdea = {
      title: "Momentum Study",
      hypothesis: "Momentum persists over 3-month windows",
      dataset: "CRSP daily returns",
      methodology: "Cross-sectional regression",
      eval_metric: "Sharpe ratio",
      difficulty: "advanced",
    };
    expect(idea.title).toBe("Momentum Study");
    expect(idea.difficulty).toBe("advanced");
  });

  it("MicroTask has all required fields", () => {
    const task: MicroTask = {
      task_description: "Build a REST API",
      resource_link: "https://example.com",
      hands_on_exercise: "Create GET endpoint",
    };
    expect(task.task_description).toBeTruthy();
    expect(task.resource_link).toBeTruthy();
    expect(task.hands_on_exercise).toBeTruthy();
  });
});
