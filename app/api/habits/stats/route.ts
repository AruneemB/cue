import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import {
  calculateStreak,
  calculateLongestStreak,
  getLevel,
  getLevelProgress,
  XP_PER_LEVEL,
} from "@/lib/xp";
import type { ActivityType } from "@/types/database";

export async function GET() {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve user UUID
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch all habit logs for the user (last 365 days for heatmap, all for XP)
  const oneYearAgo = new Date();
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);

  const [allLogsResult, recentLogsResult] = await Promise.all([
    supabaseAdmin
      .from("habit_logs")
      .select("xp_earned, type")
      .eq("user_id", user.id),
    supabaseAdmin
      .from("habit_logs")
      .select("id, type, xp_earned, logged_at, source_id, duration_mins, notes")
      .eq("user_id", user.id)
      .gte("logged_at", oneYearAgo.toISOString())
      .order("logged_at", { ascending: false }),
  ]);

  if (allLogsResult.error || recentLogsResult.error) {
    console.error(
      "Failed to fetch habit logs:",
      allLogsResult.error ?? recentLogsResult.error
    );
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }

  const allLogs = allLogsResult.data ?? [];
  const recentLogs = recentLogsResult.data ?? [];

  // ── Total XP & Level ──────────────────────────────────────
  const totalXP = allLogs.reduce((sum, log) => sum + (log.xp_earned ?? 0), 0);
  const level = getLevel(totalXP);
  const levelProgress = getLevelProgress(totalXP);

  // ── Streaks ───────────────────────────────────────────────
  const activeDates = recentLogs.map((l) => l.logged_at);
  const currentStreak = calculateStreak(activeDates);
  const longestStreak = calculateLongestStreak(activeDates);

  // Last active date
  const lastActiveDate = recentLogs.length > 0 ? recentLogs[0].logged_at : null;

  // ── Heatmap data (daily XP for last 365 days) ────────────
  const dailyXP: Record<string, number> = {};
  for (const log of recentLogs) {
    const day = log.logged_at.slice(0, 10);
    dailyXP[day] = (dailyXP[day] ?? 0) + (log.xp_earned ?? 0);
  }

  // Convert to sorted array for the frontend
  const heatmap = Object.entries(dailyXP)
    .map(([date, xp]) => ({ date, xp }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Channel breakdown ─────────────────────────────────────
  const channelBreakdown: Record<string, { count: number; xp: number }> = {};
  for (const log of allLogs) {
    const channel = log.type as ActivityType;
    if (!channelBreakdown[channel]) {
      channelBreakdown[channel] = { count: 0, xp: 0 };
    }
    channelBreakdown[channel].count++;
    channelBreakdown[channel].xp += log.xp_earned ?? 0;
  }

  // ── Recent activity (last 20 entries) ─────────────────────
  const recentActivity = recentLogs.slice(0, 20);

  return NextResponse.json({
    total_xp: totalXP,
    level,
    level_progress: levelProgress,
    xp_to_next_level: XP_PER_LEVEL - levelProgress,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_active_date: lastActiveDate,
    heatmap,
    channel_breakdown: channelBreakdown,
    recent_activity: recentActivity,
  });
}
