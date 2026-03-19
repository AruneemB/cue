import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { GithubRepoCard } from "@/components/modules/GithubRepoCard";
import { LeetCodeCard } from "@/components/modules/LeetCodeCard";
import { KaggleIdeaCard } from "@/components/modules/KaggleIdeaCard";
import { RoadmapNode } from "@/components/modules/RoadmapNode";

import type { ScoredRepo } from "@/types/github";
import type { DailyChallenge } from "@/types/leetcode";
import type { KaggleIdea } from "@/types/database";
import type { RoadmapNode as RoadmapNodeType } from "@/types/roadmap";

// ── GithubRepoCard ──────────────────────────────────────────────

describe("GithubRepoCard", () => {
  function makeScored(overrides: Partial<ScoredRepo> = {}): ScoredRepo {
    return {
      repo: {
        id: 1,
        name: "my-repo",
        full_name: "user/my-repo",
        html_url: "https://github.com/user/my-repo",
        description: "A test repository",
        fork: false,
        archived: false,
        language: "TypeScript",
        stargazers_count: 42,
        open_issues_count: 3,
        pushed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      },
      score: 15.6,
      daysSinceLastPush: 10,
      ...overrides,
    };
  }

  it("renders repo name", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("my-repo")).toBeInTheDocument();
  });

  it("renders repo description", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("A test repository")).toBeInTheDocument();
  });

  it("renders score as points", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("15.6 pts")).toBeInTheDocument();
  });

  it("renders language", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("renders star count", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders open issues count when > 0", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders idle days indicator", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("10d idle")).toBeInTheDocument();
  });

  it("renders Log Commit button", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("Log Commit")).toBeInTheDocument();
  });

  it("shows Logging... when logging prop is true", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} logging={true} />);
    expect(screen.getByText("Logging...")).toBeInTheDocument();
  });

  it("calls onLog with repo name when Log Commit is clicked", () => {
    const onLog = vi.fn();
    render(<GithubRepoCard scored={makeScored()} onLog={onLog} />);
    fireEvent.click(screen.getByText("Log Commit"));
    expect(onLog).toHaveBeenCalledWith("my-repo");
  });

  it("renders Recent commits button", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    expect(screen.getByText("Recent commits")).toBeInTheDocument();
  });

  it("links to the repo on GitHub", () => {
    render(<GithubRepoCard scored={makeScored()} onLog={vi.fn()} />);
    const link = screen.getByText("my-repo").closest("a");
    expect(link?.getAttribute("href")).toBe("https://github.com/user/my-repo");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("applies red urgency color for 14+ idle days", () => {
    const { container } = render(
      <GithubRepoCard scored={makeScored({ daysSinceLastPush: 14 })} onLog={vi.fn()} />
    );
    const idleSpan = container.querySelector(".text-red-400");
    expect(idleSpan).not.toBeNull();
  });

  it("applies amber urgency color for 7-13 idle days", () => {
    const { container } = render(
      <GithubRepoCard scored={makeScored({ daysSinceLastPush: 7 })} onLog={vi.fn()} />
    );
    const idleSpan = container.querySelector(".text-amber-400");
    expect(idleSpan).not.toBeNull();
  });

  it("does not render description when null", () => {
    const scored = makeScored();
    scored.repo.description = null;
    render(<GithubRepoCard scored={scored} onLog={vi.fn()} />);
    expect(screen.queryByText("A test repository")).toBeNull();
  });
});

// ── LeetCodeCard ────────────────────────────────────────────────

describe("LeetCodeCard", () => {
  function makeChallenge(overrides: Partial<DailyChallenge> = {}): DailyChallenge {
    return {
      date: "2025-06-15",
      link: "/problems/two-sum",
      question: {
        title: "Two Sum",
        difficulty: "Easy",
        acRate: 49.5,
        topicTags: [{ name: "Array" }, { name: "Hash Table" }],
      },
      ...overrides,
    };
  }

  it("renders the problem title", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
  });

  it("renders the date", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    expect(screen.getByText("2025-06-15")).toBeInTheDocument();
  });

  it("renders difficulty badge", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
  });

  it("renders acceptance rate", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    expect(screen.getByText("49.5%")).toBeInTheDocument();
  });

  it("renders topic tags", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    expect(screen.getByText("Array")).toBeInTheDocument();
    expect(screen.getByText("Hash Table")).toBeInTheDocument();
  });

  it("renders Open on LeetCode link with correct href", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    const link = screen.getByText(/Open on LeetCode/).closest("a");
    expect(link?.getAttribute("href")).toBe("https://leetcode.com/problems/two-sum");
  });

  it("renders Mark Solved button with XP", () => {
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} />);
    expect(screen.getByText("Mark Solved (+50 XP)")).toBeInTheDocument();
  });

  it("calls onMarkSolved when button is clicked", () => {
    const onMarkSolved = vi.fn();
    render(<LeetCodeCard challenge={makeChallenge()} onMarkSolved={onMarkSolved} />);
    fireEvent.click(screen.getByText("Mark Solved (+50 XP)"));
    expect(onMarkSolved).toHaveBeenCalled();
  });

  it("shows Logging... when solving prop is true", () => {
    render(
      <LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} solving={true} />
    );
    expect(screen.getByText("Logging...")).toBeInTheDocument();
  });

  it("shows Solved when solved prop is true", () => {
    render(
      <LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} solved={true} />
    );
    expect(screen.getByText("Solved")).toBeInTheDocument();
  });

  it("disables button when solved", () => {
    render(
      <LeetCodeCard challenge={makeChallenge()} onMarkSolved={vi.fn()} solved={true} />
    );
    const btn = screen.getByText("Solved");
    expect(btn).toBeDisabled();
  });

  it("applies difficulty styling for Medium", () => {
    const challenge = makeChallenge();
    challenge.question.difficulty = "Medium";
    const { container } = render(
      <LeetCodeCard challenge={challenge} onMarkSolved={vi.fn()} />
    );
    const badge = screen.getByText("Medium");
    expect(badge.className).toContain("text-amber-400");
  });

  it("applies difficulty styling for Hard", () => {
    const challenge = makeChallenge();
    challenge.question.difficulty = "Hard";
    const { container } = render(
      <LeetCodeCard challenge={challenge} onMarkSolved={vi.fn()} />
    );
    const badge = screen.getByText("Hard");
    expect(badge.className).toContain("text-red-400");
  });
});

// ── KaggleIdeaCard ──────────────────────────────────────────────

describe("KaggleIdeaCard", () => {
  function makeIdea(overrides: Partial<KaggleIdea> = {}): KaggleIdea {
    return {
      id: "idea-uuid-1",
      user_id: "user-uuid-1",
      title: "Momentum Factor Timing",
      description: null,
      url: null,
      hypothesis: "ML models can predict regime changes",
      dataset: "CRSP daily returns",
      methodology: "Random forest approach",
      eval_metric: "Sharpe ratio",
      difficulty: "intermediate",
      tags: ["momentum strategies"],
      saved: false,
      created_at: "2025-06-01T00:00:00Z",
      ...overrides,
    };
  }

  it("renders idea title", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByText("Momentum Factor Timing")).toBeInTheDocument();
  });

  it("renders hypothesis", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByText("ML models can predict regime changes")).toBeInTheDocument();
  });

  it("renders difficulty badge", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByText("intermediate")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByText("momentum strategies")).toBeInTheDocument();
  });

  it("renders Start Project button with XP", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByText("Start Project (+40 XP)")).toBeInTheDocument();
  });

  it("calls onStart with id and title when Start Project is clicked", () => {
    const onStart = vi.fn();
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={onStart} />);
    fireEvent.click(screen.getByText("Start Project (+40 XP)"));
    expect(onStart).toHaveBeenCalledWith("idea-uuid-1", "Momentum Factor Timing");
  });

  it("renders Save button with correct title for unsaved idea", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByTitle("Save")).toBeInTheDocument();
  });

  it("renders Unsave button with correct title for saved idea", () => {
    render(
      <KaggleIdeaCard idea={makeIdea({ saved: true })} onToggleSave={vi.fn()} onStart={vi.fn()} />
    );
    expect(screen.getByTitle("Unsave")).toBeInTheDocument();
  });

  it("calls onToggleSave with id and toggled value", () => {
    const onToggleSave = vi.fn();
    render(
      <KaggleIdeaCard idea={makeIdea({ saved: false })} onToggleSave={onToggleSave} onStart={vi.fn()} />
    );
    fireEvent.click(screen.getByTitle("Save"));
    expect(onToggleSave).toHaveBeenCalledWith("idea-uuid-1", true);
  });

  it("renders More details toggle", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByText("More details")).toBeInTheDocument();
  });

  it("shows expanded details when More details is clicked", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);

    // Before expanding, details should not be visible
    expect(screen.queryByText("Dataset:")).toBeNull();

    fireEvent.click(screen.getByText("More details"));

    // After expanding
    expect(screen.getByText("Dataset:")).toBeInTheDocument();
    expect(screen.getByText("CRSP daily returns")).toBeInTheDocument();
    expect(screen.getByText("Methodology:")).toBeInTheDocument();
    expect(screen.getByText("Random forest approach")).toBeInTheDocument();
    expect(screen.getByText("Eval Metric:")).toBeInTheDocument();
    expect(screen.getByText("Sharpe ratio")).toBeInTheDocument();
  });

  it("collapses expanded details back to Less", () => {
    render(<KaggleIdeaCard idea={makeIdea()} onToggleSave={vi.fn()} onStart={vi.fn()} />);
    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByText("Less")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Less"));
    expect(screen.getByText("More details")).toBeInTheDocument();
  });

  it("does not render hypothesis when null", () => {
    render(
      <KaggleIdeaCard
        idea={makeIdea({ hypothesis: null })}
        onToggleSave={vi.fn()}
        onStart={vi.fn()}
      />
    );
    expect(screen.queryByText("ML models can predict regime changes")).toBeNull();
  });
});

// ── RoadmapNode ─────────────────────────────────────────────────

describe("RoadmapNode", () => {
  function makeNode(overrides: Partial<RoadmapNodeType> = {}): RoadmapNodeType {
    return {
      id: "goal-1",
      name: "Learn TypeScript",
      status: "in-progress",
      completion_pct: 40,
      ...overrides,
    };
  }

  it("renders node name", () => {
    render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    expect(screen.getByText("Learn TypeScript")).toBeInTheDocument();
  });

  it("renders In Progress status label for in-progress node", () => {
    render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders Done status label for done node", () => {
    render(
      <RoadmapNode node={makeNode({ status: "done", completion_pct: 100 })} onUpdate={vi.fn()} />
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders Not Started status label", () => {
    render(
      <RoadmapNode node={makeNode({ status: "not-started", completion_pct: 0 })} onUpdate={vi.fn()} />
    );
    expect(screen.getByText("Not Started")).toBeInTheDocument();
  });

  it("renders Progress label and percentage", () => {
    render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    const { container } = render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    const progressBar = container.querySelector(".bg-emerald-500");
    expect(progressBar?.getAttribute("style")).toContain("width: 40%");
  });

  it("renders range slider for non-done nodes", () => {
    const { container } = render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    const slider = container.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute("value")).toBe("40");
  });

  it("does not render range slider for done nodes", () => {
    const { container } = render(
      <RoadmapNode node={makeNode({ status: "done", completion_pct: 100 })} onUpdate={vi.fn()} />
    );
    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeNull();
  });

  it("does not show Update button until slider value changes", () => {
    render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    expect(screen.queryByText("Update")).toBeNull();
  });

  it("shows Update button when slider value changes", () => {
    const { container } = render(<RoadmapNode node={makeNode()} onUpdate={vi.fn()} />);
    const slider = container.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: "60" } });
    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("calls onUpdate with node id and new value when Update is clicked", () => {
    const onUpdate = vi.fn();
    const { container } = render(<RoadmapNode node={makeNode()} onUpdate={onUpdate} />);
    const slider = container.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: "75" } });
    fireEvent.click(screen.getByText("Update"));
    expect(onUpdate).toHaveBeenCalledWith("goal-1", 75);
  });

  it("shows Saving... when updating prop is true and slider changed", () => {
    const { container } = render(
      <RoadmapNode node={makeNode()} onUpdate={vi.fn()} updating={true} />
    );
    const slider = container.querySelector('input[type="range"]')!;
    fireEvent.change(slider, { target: { value: "60" } });
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("renders 0% progress for not-started nodes", () => {
    const { container } = render(
      <RoadmapNode node={makeNode({ status: "not-started", completion_pct: 0 })} onUpdate={vi.fn()} />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
    const progressBar = container.querySelector(".bg-emerald-500");
    expect(progressBar?.getAttribute("style")).toContain("width: 0%");
  });

  it("renders 100% progress for done nodes", () => {
    const { container } = render(
      <RoadmapNode node={makeNode({ status: "done", completion_pct: 100 })} onUpdate={vi.fn()} />
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
    const progressBar = container.querySelector(".bg-emerald-500");
    expect(progressBar?.getAttribute("style")).toContain("width: 100%");
  });
});
