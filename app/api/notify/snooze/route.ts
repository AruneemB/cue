import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { verifySnoozeToken } from "@/lib/push";
import { z } from "zod";

const SnoozeSchema = z.object({
  minutes: z.number().int().min(1).max(480),
  snoozeToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
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

  // Resolve user ID via session auth or signed snooze token
  let userId: string | null = null;

  const session = await auth();
  if (session?.githubId) {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("github_id", session.githubId)
      .single();

    if (user) {
      userId = user.id;
    }
  }

  if (!userId && parsed.data.snoozeToken) {
    userId = verifySnoozeToken(parsed.data.snoozeToken);
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snoozedUntil = new Date(
    Date.now() + parsed.data.minutes * 60 * 1000
  ).toISOString();

  // Update the most recent notification with snoozed_until
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ snoozed_until: snoozedUntil })
    .eq("user_id", userId)
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
