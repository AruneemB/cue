import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { calculateXP, calculateStreak, isStreakBonusDue, STREAK_BONUS_XP } from "@/lib/xp";
import type { ActivityType } from "@/types/database";

const HabitLogSchema = z.object({
  type: z.enum(["github", "kaggle", "roadmap", "leetcode", "manual"]),
  source_id: z.string().max(255).optional(),
  duration_mins: z.number().int().min(1).max(1440).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = HabitLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { type, source_id, duration_mins, notes } = parsed.data;

  // Resolve the user's internal UUID from their GitHub ID
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Calculate XP for this activity
  const xpEarned = calculateXP(type as ActivityType, duration_mins);

  // Insert the habit log
  const { data: log, error: insertError } = await supabaseAdmin
    .from("habit_logs")
    .insert({
      user_id: user.id,
      type,
      source_id: source_id ?? null,
      duration_mins: duration_mins ?? null,
      notes: notes ?? null,
      xp_earned: xpEarned,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert habit log:", insertError);
    return NextResponse.json(
      { error: "Failed to log habit" },
      { status: 500 }
    );
  }

  // Check if a streak bonus should be awarded
  let streakBonus = 0;
  const { data: recentLogs } = await supabaseAdmin
    .from("habit_logs")
    .select("logged_at")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(365);

  if (recentLogs && recentLogs.length > 0) {
    const activeDates = recentLogs.map((l) => l.logged_at);
    const currentStreak = calculateStreak(activeDates);

    if (isStreakBonusDue(currentStreak)) {
      streakBonus = STREAK_BONUS_XP;

      // Insert a bonus log entry for the streak milestone
      await supabaseAdmin.from("habit_logs").insert({
        user_id: user.id,
        type: "manual",
        source_id: `streak-bonus-${currentStreak}`,
        xp_earned: STREAK_BONUS_XP,
        notes: `${currentStreak}-day streak bonus!`,
      });
    }
  }

  return NextResponse.json({
    log,
    xp_earned: xpEarned,
    streak_bonus: streakBonus,
    total_xp_awarded: xpEarned + streakBonus,
  });
}
