import { describe, it, expect, vi, afterEach } from "vitest";

import {
  calculateXP,
  getLevel,
  getLevelProgress,
  isStreakBonusDue,
  calculateStreak,
  calculateLongestStreak,
  XP_PER_LEVEL,
  STREAK_BONUS_XP,
  STREAK_BONUS_DAYS,
} from "@/lib/xp";

// ── calculateXP ────────────────────────────────────────────

describe("calculateXP", () => {
  it("returns 20 XP for github", () => {
    expect(calculateXP("github")).toBe(20);
  });

  it("returns 50 XP for leetcode", () => {
    expect(calculateXP("leetcode")).toBe(50);
  });

  it("returns 30 XP for roadmap", () => {
    expect(calculateXP("roadmap")).toBe(30);
  });

  it("returns 40 XP for kaggle", () => {
    expect(calculateXP("kaggle")).toBe(40);
  });

  it("ignores durationMins for non-manual types", () => {
    expect(calculateXP("github", 120)).toBe(20);
    expect(calculateXP("leetcode", 60)).toBe(50);
  });

  it("returns base 10 XP for manual with no duration", () => {
    expect(calculateXP("manual")).toBe(10);
  });

  it("returns base 10 XP for manual with null duration", () => {
    expect(calculateXP("manual", null)).toBe(10);
  });

  it("returns base 10 XP for manual with 0 duration", () => {
    expect(calculateXP("manual", 0)).toBe(10);
  });

  it("returns base 10 XP for manual with negative duration", () => {
    expect(calculateXP("manual", -5)).toBe(10);
  });

  it("scales manual XP with duration (base + minutes)", () => {
    expect(calculateXP("manual", 5)).toBe(15); // 10 + 5
    expect(calculateXP("manual", 10)).toBe(20); // 10 + 10
  });

  it("caps manual XP at 30", () => {
    expect(calculateXP("manual", 20)).toBe(30); // 10 + 20 = 30
    expect(calculateXP("manual", 100)).toBe(30); // capped
    expect(calculateXP("manual", 1440)).toBe(30); // max duration still capped
  });

  it("returns exactly 30 XP for manual at 20 minutes (boundary)", () => {
    expect(calculateXP("manual", 20)).toBe(30);
  });

  it("returns 11 XP for manual with 1 minute", () => {
    expect(calculateXP("manual", 1)).toBe(11);
  });
});

// ── getLevel / getLevelProgress ────────────────────────────

describe("getLevel", () => {
  it("returns level 1 at 0 XP", () => {
    expect(getLevel(0)).toBe(1);
  });

  it("returns level 1 at 499 XP", () => {
    expect(getLevel(499)).toBe(1);
  });

  it("returns level 2 at 500 XP", () => {
    expect(getLevel(500)).toBe(2);
  });

  it("returns level 2 at 999 XP", () => {
    expect(getLevel(999)).toBe(2);
  });

  it("returns level 3 at 1000 XP", () => {
    expect(getLevel(1000)).toBe(3);
  });

  it("handles large XP values", () => {
    expect(getLevel(10000)).toBe(21);
  });
});

describe("getLevelProgress", () => {
  it("returns 0 at level boundary (0 XP)", () => {
    expect(getLevelProgress(0)).toBe(0);
  });

  it("returns 0 at exact level boundary (500 XP)", () => {
    expect(getLevelProgress(500)).toBe(0);
  });

  it("returns 499 just before level boundary", () => {
    expect(getLevelProgress(499)).toBe(499);
  });

  it("returns progress within a level", () => {
    expect(getLevelProgress(750)).toBe(250);
  });

  it("handles large values", () => {
    expect(getLevelProgress(1234)).toBe(234);
  });
});

// ── Constants ──────────────────────────────────────────────

describe("exported constants", () => {
  it("XP_PER_LEVEL is 500", () => {
    expect(XP_PER_LEVEL).toBe(500);
  });

  it("STREAK_BONUS_XP is 100", () => {
    expect(STREAK_BONUS_XP).toBe(100);
  });

  it("STREAK_BONUS_DAYS is 7", () => {
    expect(STREAK_BONUS_DAYS).toBe(7);
  });
});

// ── isStreakBonusDue ───────────────────────────────────────

describe("isStreakBonusDue", () => {
  it("returns false for 0 days", () => {
    expect(isStreakBonusDue(0)).toBe(false);
  });

  it("returns false for streaks 1-6", () => {
    for (let i = 1; i <= 6; i++) {
      expect(isStreakBonusDue(i)).toBe(false);
    }
  });

  it("returns true at 7 days", () => {
    expect(isStreakBonusDue(7)).toBe(true);
  });

  it("returns false for 8-13 days", () => {
    for (let i = 8; i <= 13; i++) {
      expect(isStreakBonusDue(i)).toBe(false);
    }
  });

  it("returns true at 14 days (second bonus)", () => {
    expect(isStreakBonusDue(14)).toBe(true);
  });

  it("returns true at 21 days (third bonus)", () => {
    expect(isStreakBonusDue(21)).toBe(true);
  });
});

// ── calculateStreak ────────────────────────────────────────

describe("calculateStreak", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function daysAgo(n: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10) + "T12:00:00Z";
  }

  it("returns 0 for empty array", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("returns 1 when only today has activity", () => {
    expect(calculateStreak([daysAgo(0)])).toBe(1);
  });

  it("returns 1 when only yesterday has activity", () => {
    expect(calculateStreak([daysAgo(1)])).toBe(1);
  });

  it("returns 2 for today + yesterday", () => {
    expect(calculateStreak([daysAgo(0), daysAgo(1)])).toBe(2);
  });

  it("returns 3 for three consecutive days ending today", () => {
    expect(calculateStreak([daysAgo(0), daysAgo(1), daysAgo(2)])).toBe(3);
  });

  it("returns 3 for three consecutive days ending yesterday (no today)", () => {
    expect(calculateStreak([daysAgo(1), daysAgo(2), daysAgo(3)])).toBe(3);
  });

  it("returns 0 when last activity was 2 days ago (gap)", () => {
    expect(calculateStreak([daysAgo(2)])).toBe(0);
  });

  it("counts only the current run (ignores older streak)", () => {
    // Today + yesterday, then gap, then 3 older days
    const dates = [daysAgo(0), daysAgo(1), daysAgo(5), daysAgo(6), daysAgo(7)];
    expect(calculateStreak(dates)).toBe(2);
  });

  it("handles duplicate dates within the same day", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(
      calculateStreak([
        `${today}T08:00:00Z`,
        `${today}T12:00:00Z`,
        `${today}T18:00:00Z`,
      ])
    ).toBe(1);
  });

  it("handles Date objects in addition to strings", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    expect(calculateStreak([today, yesterday])).toBe(2);
  });
});

// ── calculateLongestStreak ─────────────────────────────────

describe("calculateLongestStreak", () => {
  function makeDate(offset: number): string {
    const d = new Date("2025-06-01T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString();
  }

  it("returns 0 for empty array", () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  it("returns 1 for a single date", () => {
    expect(calculateLongestStreak(["2025-01-15T12:00:00Z"])).toBe(1);
  });

  it("returns 3 for three consecutive days", () => {
    expect(
      calculateLongestStreak([makeDate(0), makeDate(1), makeDate(2)])
    ).toBe(3);
  });

  it("returns longest of multiple streaks", () => {
    // streak of 2, gap, streak of 4
    const dates = [
      makeDate(0), makeDate(1),     // 2-day streak
      makeDate(5), makeDate(6), makeDate(7), makeDate(8), // 4-day streak
    ];
    expect(calculateLongestStreak(dates)).toBe(4);
  });

  it("handles unsorted input", () => {
    const dates = [makeDate(2), makeDate(0), makeDate(1)];
    expect(calculateLongestStreak(dates)).toBe(3);
  });

  it("deduplicates same-day entries", () => {
    const day = "2025-06-01";
    expect(
      calculateLongestStreak([
        `${day}T08:00:00Z`,
        `${day}T12:00:00Z`,
        `${day}T18:00:00Z`,
      ])
    ).toBe(1);
  });

  it("returns 1 when all dates are the same day", () => {
    expect(
      calculateLongestStreak([
        "2025-03-01T10:00:00Z",
        "2025-03-01T14:00:00Z",
      ])
    ).toBe(1);
  });

  it("handles a long unbroken streak", () => {
    const dates = Array.from({ length: 30 }, (_, i) => makeDate(i));
    expect(calculateLongestStreak(dates)).toBe(30);
  });

  it("recognizes the first streak when multiple equal-length streaks exist", () => {
    // Two streaks of length 3 with a gap
    const dates = [
      makeDate(0), makeDate(1), makeDate(2),
      makeDate(10), makeDate(11), makeDate(12),
    ];
    expect(calculateLongestStreak(dates)).toBe(3);
  });
});
