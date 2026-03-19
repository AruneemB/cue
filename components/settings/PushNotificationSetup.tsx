"use client";

import { useState } from "react";
import { Bell, BellOff, Check, AlertTriangle } from "lucide-react";

interface PushNotificationSetupProps {
  pushEnabled: boolean;
  vapidPublicKey: string;
  onSubscribed: () => void;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationSetup({
  pushEnabled,
  vapidPublicKey,
  onSubscribed,
}: PushNotificationSetupProps) {
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(pushEnabled);

  async function handleEnable() {
    setEnabling(true);
    setError(null);

    try {
      // Check browser support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Push notifications are not supported in this browser.");
        setEnabling(false);
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was denied. Please enable it in your browser settings.");
        setEnabling(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      // Extract keys
      const subJson = subscription.toJSON();
      const pushSub = {
        endpoint: subJson.endpoint!,
        keys: {
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
      };

      // Send to server
      const res = await fetch("/api/notify/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pushSub),
      });

      if (!res.ok) {
        throw new Error("Failed to save subscription on server");
      }

      setEnabled(true);
      onSubscribed();
    } catch (err) {
      console.error("Push setup failed:", err);
      if (!error) {
        setError("Failed to enable push notifications. Please try again.");
      }
    } finally {
      setEnabling(false);
    }
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        {enabled ? <Bell size={18} className="text-emerald-400" /> : <BellOff size={18} />}
        <h2 className="text-sm font-semibold">Push Notifications</h2>
      </div>

      {enabled ? (
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs">
          <Check size={14} className="text-emerald-400" />
          <span className="text-foreground/70">
            Push notifications are enabled. You&apos;ll receive hourly nudges in this browser.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-foreground/50">
            Enable push notifications to receive hourly nudges directly in your browser.
            On iOS, you must first add Cue to your Home Screen (PWA).
          </p>
          <button
            onClick={handleEnable}
            disabled={enabling}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Bell size={14} />
            {enabling ? "Setting up..." : "Enable Push Notifications"}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
