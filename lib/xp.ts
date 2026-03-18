import type { ActivityType } from "@/types/database";

// ── XP award table (Section 8 of CUE-SPEC) ─────────────────
const FIXED_XP: Record<Exclude<ActivityType, "manual">, number> = {
  github: 20,
  leetcode: 50,
  roadmap: 30,
  kaggle: 40,
};

/** Manual session XP: 10 XP base, +1 XP per minute, capped at 30 XP */
const MANUAL_BASE_XP = 10;
const MANUAL_MAX_XP = 30;

/** Bonus XP awarded for maintaining a 7-day streak */
export const STREAK_BONUS_XP = 100;
export const STREAK_BONUS_DAYS = 7;

/** XP required per level (every 500 XP = 1 level) */
export const XP_PER_LEVEL = 500;

/**
 * Calculate XP earned for a given activity type.
 * Manual sessions scale with duration (10–30 XP).
 */
export function calculateXP(
  type: ActivityType,
  durationMins?: number | null
): number {
  if (type === "manual") {
    if (!durationMins || durationMins <= 0) return MANUAL_BASE_XP;
    return Math.min(MANUAL_BASE_XP + durationMins, MANUAL_MAX_XP);
  }
  return FIXED_XP[type];
}

/** Derive user level from total XP (level 1 at 0 XP, level 2 at 500 XP, etc.) */
export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

/** XP progress within the current level (0 – XP_PER_LEVEL-1) */
export function getLevelProgress(totalXP: number): number {
  return totalXP % XP_PER_LEVEL;
}

/**
 * Determine if a streak bonus should be awarded.
 * Returns true when the streak length is a positive multiple of STREAK_BONUS_DAYS.
 */
export function isStreakBonusDue(currentStreak: number): boolean {
  return currentStreak > 0 && currentStreak % STREAK_BONUS_DAYS === 0;
}

/**
 * Calculate current streak from an array of dates that had activity.
 * Dates must be ISO strings or Date objects. The function works backwards
 * from today, counting consecutive days with at least one entry.
 */
export function calculateStreak(activeDates: (string | Date)[]): number {
  if (activeDates.length === 0) return 0;

  const daySet = new Set(
    activeDates.map((d) => toDateKey(new Date(d)))
  );

  const today = toDateKey(new Date());
  // If user has no activity today, start checking from yesterday
  let cursor = daySet.has(today) ? new Date() : yesterday(new Date());
  let streak = 0;

  while (daySet.has(toDateKey(cursor))) {
    streak++;
    cursor = yesterday(cursor);
  }

  return streak;
}

/**
 * Calculate the longest streak from an ordered array of active dates.
 */
export function calculateLongestStreak(activeDates: (string | Date)[]): number {
  if (activeDates.length === 0) return 0;

  const sorted = [...new Set(activeDates.map((d) => toDateKey(new Date(d))))].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z");
    const curr = new Date(sorted[i] + "T00:00:00Z");
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

// ── Helpers ─────────────────────────────────────────────────

/** Format a Date to YYYY-MM-DD in UTC */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Return the previous calendar day */
function yesterday(d: Date): Date {
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return prev;
}
