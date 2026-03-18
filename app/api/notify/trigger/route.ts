import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { sendPush, generateSnoozeToken } from "@/lib/push";
import { checkDedup, markSent } from "@/lib/redis";
import { pickChannel, isQuietHour, buildNotification } from "@/lib/notify";
import type { User } from "@/types/database";

/**
 * GET /api/notify/trigger
 *
 * Vercel Cron endpoint — fires every hour (0 * * * *).
 * Protected by CRON_SECRET bearer token.
 *
 * Flow: auth → iterate users → pick channel → quiet hours check →
 *       dedup check → build message → send push → log to DB → mark dedup
 */
export async function GET(req: NextRequest) {
  // 1. Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch all users with push subscriptions
  const { data: users, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("*")
    .not("push_subscription", "is", null);

  if (fetchError) {
    console.error("Failed to fetch users:", fetchError);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No subscribed users" });
  }

  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const user of users as User[]) {
    try {
      await processUser(user, now);
      sent++;
    } catch (err) {
      console.error(`Failed to notify user ${user.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped });
}

async function processUser(user: User, now: Date): Promise<void> {
  const prefs = user.notify_prefs;

  // Check if notifications are disabled
  if (prefs && !prefs.enabled) return;

  // Check quiet hours
  if (isQuietHour(prefs, now)) return;

  // Check if user is snoozed (most recent notification has future snoozed_until)
  const { data: recentNotif } = await supabaseAdmin
    .from("notifications")
    .select("snoozed_until")
    .eq("user_id", user.id)
    .order("delivered_at", { ascending: false })
    .limit(1)
    .single();

  if (recentNotif?.snoozed_until) {
    const snoozedUntil = new Date(recentNotif.snoozed_until);
    if (snoozedUntil > now) return;
  }

  // Pick channel
  const channel = pickChannel(prefs, now);

  // Dedup check via Redis
  const isDuplicate = await checkDedup(user.id, channel);
  if (isDuplicate) return;

  // Build notification payload
  const payload = await buildNotification(channel, {
    accessToken: user.github_token ?? "",
    roadmapData: user.roadmap_data,
  });

  if (!payload) return;

  // Attach signed snooze token so the service worker can snooze
  // without relying on session cookies
  payload.snoozeToken = generateSnoozeToken(user.id);

  // Send push notification
  if (user.push_subscription) {
    const success = await sendPush(user.push_subscription, payload);

    if (!success) {
      // Subscription is expired — clear it
      await supabaseAdmin
        .from("users")
        .update({ push_subscription: null })
        .eq("id", user.id);
      return;
    }
  }

  // Log to notifications table
  await supabaseAdmin.from("notifications").insert({
    user_id: user.id,
    channel,
    title: payload.title,
    body: payload.body,
    action_url: payload.actionUrl,
  });

  // Mark dedup key in Redis (90-minute TTL)
  await markSent(user.id, channel);
}
