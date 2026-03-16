import webpush from "web-push";
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
