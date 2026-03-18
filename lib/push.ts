import webpush from "web-push";
import crypto from "crypto";
import type { PushSubscription } from "@/types/database";

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY");
  }
  return { publicKey, privateKey };
}

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const { publicKey, privateKey } = getVapidKeys();
  webpush.setVapidDetails(
    "mailto:noreply@cue-app.vercel.app",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  actionUrl: string;
  snoozeToken?: string;
}

/**
 * Send a Web Push notification to a single subscription.
 * Returns true on success, false if the subscription is expired/invalid.
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  ensureVapidConfigured();

  const pushSub: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload), {
      TTL: 3600,
    });
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired or unsubscribed
      console.warn("Push subscription expired, should be removed");
      return false;
    }
    console.error("Web Push send failed:", err);
    return false;
  }
}

/** Returns the public VAPID key for client-side subscription */
export function getPublicVapidKey(): string {
  return getVapidKeys().publicKey;
}

// ── Snooze token helpers ─────────────────────────────────────

const SNOOZE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSigningSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("Missing CRON_SECRET for token signing");
  return secret;
}

/** Generate a signed snooze token for a user. Valid for 24 hours. */
export function generateSnoozeToken(userId: string): string {
  const secret = getSigningSecret();
  const expires = Date.now() + SNOOZE_TOKEN_TTL_MS;
  const data = `${userId}:${expires}`;
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${data}:${hmac}`;
}

/** Verify a snooze token and return the userId, or null if invalid/expired. */
export function verifySnoozeToken(token: string): string | null {
  try {
    const lastColon = token.lastIndexOf(":");
    if (lastColon === -1) return null;

    const signature = token.slice(lastColon + 1);
    const data = token.slice(0, lastColon);

    const separatorIdx = data.lastIndexOf(":");
    if (separatorIdx === -1) return null;

    const userId = data.slice(0, separatorIdx);
    const expiresStr = data.slice(separatorIdx + 1);
    const expires = parseInt(expiresStr, 10);

    if (isNaN(expires) || Date.now() > expires) return null;

    const secret = getSigningSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex");

    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}
