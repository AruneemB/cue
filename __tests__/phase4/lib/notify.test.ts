import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockNotifyPrefs,
  createMockRoadmapData,
  createMockScoredRepo,
  createMockChallenge,
  createMockQuantIdea,
  createMockMicroTask,
} from "@/__tests__/helpers/mocks";
import type { NotifyPrefs, ModuleChannel } from "@/types/database";

vi.mock("@/lib/github", () => ({
  getRepoToNudge: vi.fn(),
}));

vi.mock("@/lib/leetcode", () => ({
  fetchDailyProblem: vi.fn(),
  formatDailyProblemText: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  generateQuantIdea: vi.fn(),
  formatQuantIdeaText: vi.fn(),
  generateMicroTask: vi.fn(),
  formatMicroTaskText: vi.fn(),
}));

vi.mock("@/lib/roadmap", () => ({
  parseRoadmapData: vi.fn(),
  getNextSkillNode: vi.fn(),
}));

import { pickChannel, isQuietHour, buildNotification } from "@/lib/notify";
import { getRepoToNudge } from "@/lib/github";
import { fetchDailyProblem, formatDailyProblemText } from "@/lib/leetcode";
import {
  generateQuantIdea,
  formatQuantIdeaText,
  generateMicroTask,
  formatMicroTaskText,
} from "@/lib/ai";
import { parseRoadmapData, getNextSkillNode } from "@/lib/roadmap";

describe("pickChannel", () => {
  function dateAtUTCHour(hour: number): Date {
    const d = new Date("2025-06-15T00:00:00Z");
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  }

  it("returns leetcode for hours 08-11", () => {
    for (const hour of [8, 9, 10, 11]) {
      const result = pickChannel(null, dateAtUTCHour(hour));
      expect(result).toBe("leetcode");
    }
  });

  it("returns github for hours 12-16", () => {
    for (const hour of [12, 13, 14, 15, 16]) {
      const result = pickChannel(null, dateAtUTCHour(hour));
      expect(result).toBe("github");
    }
  });

  it("returns kaggle for even hours 17-21, roadmap for odd", () => {
    expect(pickChannel(null, dateAtUTCHour(18))).toBe("kaggle");
    expect(pickChannel(null, dateAtUTCHour(20))).toBe("kaggle");
    expect(pickChannel(null, dateAtUTCHour(17))).toBe("roadmap");
    expect(pickChannel(null, dateAtUTCHour(19))).toBe("roadmap");
    expect(pickChannel(null, dateAtUTCHour(21))).toBe("roadmap");
  });

  it("round-robins ALL_CHANNELS[hour%4] for off-hours (22-07)", () => {
    // ALL_CHANNELS = ["github", "kaggle", "roadmap", "leetcode"]
    const expected: Record<number, ModuleChannel> = {
      0: "github", // 0 % 4 = 0
      1: "kaggle", // 1 % 4 = 1
      2: "roadmap", // 2 % 4 = 2
      3: "leetcode", // 3 % 4 = 3
      4: "github", // 4 % 4 = 0
      5: "kaggle",
      6: "roadmap",
      7: "leetcode",
      22: "roadmap", // 22 % 4 = 2
      23: "leetcode", // 23 % 4 = 3
    };

    for (const [hour, channel] of Object.entries(expected)) {
      expect(pickChannel(null, dateAtUTCHour(Number(hour)))).toBe(channel);
    }
  });

  it("falls back to first enabled module when preferred is disabled", () => {
    const prefs = createMockNotifyPrefs({
      enabledModules: ["github", "kaggle"],
    });
    // Hour 8 prefers leetcode, but it's disabled
    const result = pickChannel(prefs, dateAtUTCHour(8));
    expect(result).toBe("github"); // first enabled
  });

  it("respects enabledModules when preferred is enabled", () => {
    const prefs = createMockNotifyPrefs({
      enabledModules: ["leetcode", "github"],
    });
    const result = pickChannel(prefs, dateAtUTCHour(8));
    expect(result).toBe("leetcode");
  });

  it("defaults to all channels when prefs is null", () => {
    // null prefs → all channels enabled
    const result = pickChannel(null, dateAtUTCHour(12));
    expect(result).toBe("github");
  });
});

describe("isQuietHour", () => {
  function dateAtUTCTime(hours: number, minutes: number): Date {
    const d = new Date("2025-06-15T00:00:00Z");
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
  }

  it("returns false when prefs is null", () => {
    expect(isQuietHour(null)).toBe(false);
  });

  it("returns false when quiet hours fields are missing", () => {
    const prefs = createMockNotifyPrefs();
    // No quietHoursStart/End set
    expect(isQuietHour(prefs)).toBe(false);
  });

  it("detects quiet hours in same-day range", () => {
    const prefs = createMockNotifyPrefs({
      quietHoursStart: "09:00",
      quietHoursEnd: "17:00",
    });

    expect(isQuietHour(prefs, dateAtUTCTime(10, 0))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(9, 0))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(16, 59))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(17, 0))).toBe(false);
    expect(isQuietHour(prefs, dateAtUTCTime(8, 59))).toBe(false);
  });

  it("handles midnight wraparound (22:00-07:00)", () => {
    const prefs = createMockNotifyPrefs({
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    });

    expect(isQuietHour(prefs, dateAtUTCTime(23, 0))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(0, 0))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(3, 30))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(6, 59))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(7, 0))).toBe(false);
    expect(isQuietHour(prefs, dateAtUTCTime(22, 0))).toBe(true);
    expect(isQuietHour(prefs, dateAtUTCTime(21, 59))).toBe(false);
  });

  it("handles boundary: start == current", () => {
    const prefs = createMockNotifyPrefs({
      quietHoursStart: "10:00",
      quietHoursEnd: "12:00",
    });
    expect(isQuietHour(prefs, dateAtUTCTime(10, 0))).toBe(true);
  });

  it("handles boundary: end == current (exclusive)", () => {
    const prefs = createMockNotifyPrefs({
      quietHoursStart: "10:00",
      quietHoursEnd: "12:00",
    });
    expect(isQuietHour(prefs, dateAtUTCTime(12, 0))).toBe(false);
  });
});

describe("buildNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ctx = { accessToken: "ghp_token", roadmapData: null };

  it("routes github channel to buildGithub", async () => {
    const scored = createMockScoredRepo({
      daysSinceLastPush: 5,
    });
    vi.mocked(getRepoToNudge).mockResolvedValue(scored);

    const result = await buildNotification("github", ctx);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("GitHub: Time to push");
    expect(getRepoToNudge).toHaveBeenCalledWith("ghp_token");
  });

  it("github body includes repo name and days with plural", async () => {
    const scored = createMockScoredRepo({ daysSinceLastPush: 5 });
    scored.repo.name = "cool-project";
    vi.mocked(getRepoToNudge).mockResolvedValue(scored);

    const result = await buildNotification("github", ctx);
    expect(result!.body).toContain("cool-project");
    expect(result!.body).toContain("5 days");
  });

  it("github body uses singular 'day' for 1 day", async () => {
    const scored = createMockScoredRepo({ daysSinceLastPush: 1 });
    scored.repo.name = "proj";
    vi.mocked(getRepoToNudge).mockResolvedValue(scored);

    const result = await buildNotification("github", ctx);
    expect(result!.body).toContain("1 day.");
    expect(result!.body).not.toContain("1 days");
  });

  it("routes leetcode channel to buildLeetcode", async () => {
    const challenge = createMockChallenge();
    vi.mocked(fetchDailyProblem).mockResolvedValue(challenge);
    vi.mocked(formatDailyProblemText).mockReturnValue("LeetCode text");

    const result = await buildNotification("leetcode", ctx);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("LeetCode Daily");
    expect(result!.body).toBe("LeetCode text");
  });

  it("leetcode actionUrl prepends https://leetcode.com", async () => {
    const challenge = createMockChallenge({ link: "/problems/two-sum" });
    vi.mocked(fetchDailyProblem).mockResolvedValue(challenge);
    vi.mocked(formatDailyProblemText).mockReturnValue("text");

    const result = await buildNotification("leetcode", ctx);
    expect(result!.actionUrl).toBe(
      "https://leetcode.com/problems/two-sum"
    );
  });

  it("routes kaggle channel to buildKaggle", async () => {
    const idea = createMockQuantIdea();
    vi.mocked(generateQuantIdea).mockResolvedValue(idea);
    vi.mocked(formatQuantIdeaText).mockReturnValue("Quant text");

    const result = await buildNotification("kaggle", ctx);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Quant Research Idea");
    expect(result!.body).toBe("Quant text");
  });

  it("routes roadmap channel to buildRoadmap", async () => {
    const roadmapData = createMockRoadmapData();
    const ctxWithRoadmap = { ...ctx, roadmapData };
    const node = { id: "1", name: "TS", status: "in-progress" as const, completion_pct: 30 };
    const task = createMockMicroTask();

    vi.mocked(parseRoadmapData).mockReturnValue({
      name: "Frontend",
      nodes: [node],
    });
    vi.mocked(getNextSkillNode).mockReturnValue(node);
    vi.mocked(generateMicroTask).mockResolvedValue(task);
    vi.mocked(formatMicroTaskText).mockReturnValue("Roadmap text");

    const result = await buildNotification("roadmap", ctxWithRoadmap);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Roadmap: Next Skill");
  });

  it("roadmap returns null when roadmapData is null", async () => {
    const result = await buildNotification("roadmap", ctx);
    expect(result).toBeNull();
  });

  it("roadmap returns null when no in-progress node", async () => {
    const roadmapData = createMockRoadmapData();
    vi.mocked(parseRoadmapData).mockReturnValue({
      name: "Test",
      nodes: [],
    });
    vi.mocked(getNextSkillNode).mockReturnValue(null);

    const result = await buildNotification("roadmap", {
      ...ctx,
      roadmapData,
    });
    expect(result).toBeNull();
  });

  it("roadmap returns null when micro-task generation fails", async () => {
    const roadmapData = createMockRoadmapData();
    const node = { id: "1", name: "TS", status: "in-progress" as const, completion_pct: 30 };

    vi.mocked(parseRoadmapData).mockReturnValue({
      name: "Test",
      nodes: [node],
    });
    vi.mocked(getNextSkillNode).mockReturnValue(node);
    vi.mocked(generateMicroTask).mockResolvedValue(null);

    const result = await buildNotification("roadmap", {
      ...ctx,
      roadmapData,
    });
    expect(result).toBeNull();
  });

  it("returns null when github upstream returns null", async () => {
    vi.mocked(getRepoToNudge).mockResolvedValue(null);

    const result = await buildNotification("github", ctx);
    expect(result).toBeNull();
  });

  it("returns null when leetcode upstream returns null", async () => {
    vi.mocked(fetchDailyProblem).mockResolvedValue(null);

    const result = await buildNotification("leetcode", ctx);
    expect(result).toBeNull();
  });

  it("returns null when kaggle upstream returns null", async () => {
    vi.mocked(generateQuantIdea).mockResolvedValue(null);

    const result = await buildNotification("kaggle", ctx);
    expect(result).toBeNull();
  });
});
