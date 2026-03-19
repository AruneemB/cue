import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import type { NotifyPrefs, RoadmapData } from "@/types/database";

// ── Schemas ──────────────────────────────────────────────────

const NotifyPrefsSchema = z.object({
  enabled: z.boolean(),
  deliveryMethods: z.array(z.enum(["push", "email", "in_app"])),
  enabledModules: z.array(z.enum(["github", "kaggle", "roadmap", "leetcode"])),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const RoadmapGoalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  targetDate: z.string().optional(),
  completed: z.boolean(),
  completion_pct: z.number().min(0).max(100).optional(),
});

const RoadmapDataSchema = z.object({
  goals: z.array(RoadmapGoalSchema).min(1),
  currentPhase: z.string().optional(),
});

const PatchSchema = z.object({
  notify_prefs: NotifyPrefsSchema.optional(),
  roadmap_data: RoadmapDataSchema.optional(),
}).refine(
  (data) => data.notify_prefs !== undefined || data.roadmap_data !== undefined,
  { message: "At least one of notify_prefs or roadmap_data must be provided" }
);

// ── GET: Fetch current settings ─────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.githubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("notify_prefs, roadmap_data, push_subscription")
    .eq("github_id", session.githubId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const defaultPrefs: NotifyPrefs = {
    enabled: true,
    deliveryMethods: ["push"],
    enabledModules: ["github", "kaggle", "roadmap", "leetcode"],
  };

  return NextResponse.json({
    notify_prefs: (user.notify_prefs as NotifyPrefs | null) ?? defaultPrefs,
    roadmap_data: (user.roadmap_data as RoadmapData | null) ?? null,
    push_enabled: user.push_subscription !== null,
  });
}

// ── PATCH: Update settings ──────────────────────────────────

export async function PATCH(req: NextRequest) {
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

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.notify_prefs) {
    updates.notify_prefs = parsed.data.notify_prefs;
  }
  if (parsed.data.roadmap_data) {
    updates.roadmap_data = parsed.data.roadmap_data;
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("github_id", session.githubId);

  if (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ...parsed.data });
}
