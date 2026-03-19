import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { HeatmapCalendar } from "@/components/dashboard/HeatmapCalendar";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { XPBar } from "@/components/dashboard/XPBar";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

// ── HeatmapCalendar ──────────────────────────────────────────

describe("HeatmapCalendar", () => {
  it("renders the Activity title", () => {
    render(<HeatmapCalendar data={[]} />);
    expect(screen.getByText("Activity")).toBeInTheDocument();
  });

  it("renders legend labels", () => {
    render(<HeatmapCalendar data={[]} />);
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders day-of-week labels", () => {
    render(<HeatmapCalendar data={[]} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
  });

  it("renders cells with XP title attributes", () => {
    const today = new Date().toISOString().slice(0, 10);
    const { container } = render(
      <HeatmapCalendar data={[{ date: today, xp: 50 }]} />
    );
    const cell = container.querySelector(`[title="${today}: 50 XP"]`);
    expect(cell).not.toBeNull();
  });

  it("renders without crashing when data is empty", () => {
    const { container } = render(<HeatmapCalendar data={[]} />);
    expect(container.querySelector("[data-slot='card']")).not.toBeNull();
  });

  it("applies intensity coloring for cells with activity", () => {
    const today = new Date().toISOString().slice(0, 10);
    const { container } = render(
      <HeatmapCalendar data={[{ date: today, xp: 100 }]} />
    );
    const cell = container.querySelector(`[title="${today}: 100 XP"]`);
    // Should have the max intensity class (emerald-600) since it's the only data point
    expect(cell?.className).toContain("bg-emerald-600");
  });
});

// ── StreakCard ────────────────────────────────────────────────

describe("StreakCard", () => {
  it("renders the Streaks title", () => {
    render(
      <StreakCard currentStreak={0} longestStreak={0} lastActiveDate={null} />
    );
    expect(screen.getByText("Streaks")).toBeInTheDocument();
  });

  it("displays current and longest streak values", () => {
    render(
      <StreakCard currentStreak={5} longestStreak={12} lastActiveDate={null} />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders labels for Current and Longest", () => {
    render(
      <StreakCard currentStreak={0} longestStreak={0} lastActiveDate={null} />
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Longest")).toBeInTheDocument();
    expect(screen.getByText("Last Active")).toBeInTheDocument();
  });

  it("shows 'No activity yet' when lastActiveDate is null", () => {
    render(
      <StreakCard currentStreak={0} longestStreak={0} lastActiveDate={null} />
    );
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("formats lastActiveDate when provided", () => {
    render(
      <StreakCard
        currentStreak={3}
        longestStreak={7}
        lastActiveDate="2025-06-15T14:30:00Z"
      />
    );
    // toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    // Produces "Jun 15, 2025" in en-US locale
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it("renders zero values correctly", () => {
    render(
      <StreakCard currentStreak={0} longestStreak={0} lastActiveDate={null} />
    );
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(2); // current + longest
  });
});

// ── XPBar ────────────────────────────────────────────────────

describe("XPBar", () => {
  it("renders the Experience title", () => {
    render(
      <XPBar totalXP={0} level={1} levelProgress={0} xpToNextLevel={500} />
    );
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("displays total XP with locale formatting", () => {
    render(
      <XPBar totalXP={1500} level={4} levelProgress={0} xpToNextLevel={500} />
    );
    expect(screen.getByText(/1,500 XP/)).toBeInTheDocument();
  });

  it("displays current level", () => {
    render(
      <XPBar totalXP={750} level={2} levelProgress={250} xpToNextLevel={250} />
    );
    expect(screen.getByText("Level 2")).toBeInTheDocument();
  });

  it("displays XP progress fraction", () => {
    render(
      <XPBar totalXP={750} level={2} levelProgress={250} xpToNextLevel={250} />
    );
    expect(screen.getByText("250 / 500 XP")).toBeInTheDocument();
  });

  it("displays XP to next level", () => {
    render(
      <XPBar totalXP={750} level={2} levelProgress={250} xpToNextLevel={250} />
    );
    expect(screen.getByText("250 XP to Level 3")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    const { container } = render(
      <XPBar totalXP={750} level={2} levelProgress={250} xpToNextLevel={250} />
    );
    const progressBar = container.querySelector(".bg-emerald-500");
    expect(progressBar).not.toBeNull();
    // 250/500 = 50%
    expect(progressBar?.getAttribute("style")).toContain("width: 50%");
  });

  it("renders 0% progress bar at level boundary", () => {
    const { container } = render(
      <XPBar totalXP={500} level={2} levelProgress={0} xpToNextLevel={500} />
    );
    const progressBar = container.querySelector(".bg-emerald-500");
    expect(progressBar?.getAttribute("style")).toContain("width: 0%");
  });

  it("handles zero totalXP (level 1 fresh start)", () => {
    render(
      <XPBar totalXP={0} level={1} levelProgress={0} xpToNextLevel={500} />
    );
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("0 / 500 XP")).toBeInTheDocument();
    expect(screen.getByText("500 XP to Level 2")).toBeInTheDocument();
  });
});

// ── RecentActivity ───────────────────────────────────────────

describe("RecentActivity", () => {
  const now = new Date();

  function makeEntry(overrides: Partial<{
    id: string;
    type: string;
    xp_earned: number;
    logged_at: string;
    source_id: string | null;
    duration_mins: number | null;
    notes: string | null;
  }> = {}) {
    return {
      id: "entry-1",
      type: "github",
      xp_earned: 20,
      logged_at: now.toISOString(),
      source_id: null,
      duration_mins: null,
      notes: null,
      ...overrides,
    };
  }

  it("renders the Recent Activity title", () => {
    render(<RecentActivity entries={[]} />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("shows empty state message when no entries", () => {
    render(<RecentActivity entries={[]} />);
    expect(
      screen.getByText(/No activity logged yet/)
    ).toBeInTheDocument();
  });

  it("renders entry with activity type label", () => {
    render(<RecentActivity entries={[makeEntry({ type: "github" })]} />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("renders XP earned for each entry", () => {
    render(<RecentActivity entries={[makeEntry({ xp_earned: 50 })]} />);
    expect(screen.getByText("+50 XP")).toBeInTheDocument();
  });

  it("renders source_id when present", () => {
    render(
      <RecentActivity entries={[makeEntry({ source_id: "user/my-repo" })]} />
    );
    expect(screen.getByText(/user\/my-repo/)).toBeInTheDocument();
  });

  it("does not render source_id when null", () => {
    const { container } = render(
      <RecentActivity entries={[makeEntry({ source_id: null })]} />
    );
    // The label span inside the entry should only contain "GitHub" with no middot
    const label = container.querySelector(".font-medium.truncate");
    expect(label?.textContent?.trim()).toBe("GitHub");
  });

  it("renders notes when present", () => {
    render(
      <RecentActivity entries={[makeEntry({ notes: "Fixed login bug" })]} />
    );
    expect(screen.getByText("Fixed login bug")).toBeInTheDocument();
  });

  it("does not render notes paragraph when null", () => {
    const { container } = render(
      <RecentActivity entries={[makeEntry({ notes: null })]} />
    );
    const notesEl = container.querySelector(".truncate.text-xs.text-muted-foreground");
    expect(notesEl).toBeNull();
  });

  it("renders duration when present", () => {
    render(
      <RecentActivity entries={[makeEntry({ duration_mins: 45 })]} />
    );
    expect(screen.getByText(/45min/)).toBeInTheDocument();
  });

  it("renders all five activity type labels correctly", () => {
    const entries = [
      makeEntry({ id: "1", type: "github" }),
      makeEntry({ id: "2", type: "leetcode" }),
      makeEntry({ id: "3", type: "kaggle" }),
      makeEntry({ id: "4", type: "roadmap" }),
      makeEntry({ id: "5", type: "manual" }),
    ];
    render(<RecentActivity entries={entries} />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("LeetCode")).toBeInTheDocument();
    expect(screen.getByText("Kaggle")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("renders 'just now' for very recent entries", () => {
    render(
      <RecentActivity
        entries={[makeEntry({ logged_at: new Date().toISOString() })]}
      />
    );
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("renders relative time for entries from hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    render(
      <RecentActivity entries={[makeEntry({ logged_at: twoHoursAgo })]} />
    );
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("renders multiple entries", () => {
    const entries = [
      makeEntry({ id: "1", type: "github", xp_earned: 20 }),
      makeEntry({ id: "2", type: "leetcode", xp_earned: 50 }),
    ];
    render(<RecentActivity entries={entries} />);
    expect(screen.getByText("+20 XP")).toBeInTheDocument();
    expect(screen.getByText("+50 XP")).toBeInTheDocument();
  });
});
