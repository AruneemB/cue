import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { z } from "zod";

const SnoozeSchema = z.object({
  minutes: z.number().int().min(1).max(480),
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

  const parsed = SnoozeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid snooze request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const snoozedUntil = new Date(
    Date.now() + parsed.data.minutes * 60 * 1000
  ).toISOString();

  // Get the user's Supabase ID from their github_id
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update the most recent notification with snoozed_until
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ snoozed_until: snoozedUntil })
    .eq("user_id", user.id)
    .order("delivered_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Failed to snooze notification:", error);
    return NextResponse.json(
      { error: "Failed to snooze" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, snoozed_until: snoozedUntil });
}
