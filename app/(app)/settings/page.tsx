"use client";

import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { RoadmapImport } from "@/components/settings/RoadmapImport";
import { PushNotificationSetup } from "@/components/settings/PushNotificationSetup";
import type { NotifyPrefs, RoadmapData } from "@/types/database";

interface SettingsData {
  notify_prefs: NotifyPrefs;
  roadmap_data: RoadmapData | null;
  push_enabled: boolean;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error(`Failed to fetch settings (${res.status})`);
        const data: SettingsData = await res.json();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSavePrefs(prefs: NotifyPrefs): Promise<boolean> {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify_prefs: prefs }),
      });
      if (!res.ok) return false;
      setSettings((prev) => prev ? { ...prev, notify_prefs: prefs } : prev);
      return true;
    } catch {
      return false;
    }
  }

  async function handleImportRoadmap(data: RoadmapData): Promise<boolean> {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmap_data: data }),
      });
      if (!res.ok) return false;
      setSettings((prev) => prev ? { ...prev, roadmap_data: data } : prev);
      return true;
    } catch {
      return false;
    }
  }

  function handleSubscribed() {
    setSettings((prev) => prev ? { ...prev, push_enabled: true } : prev);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-destructive">
          {error ?? "Unable to load settings."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings size={24} />
          Settings
        </h1>
        <p className="text-sm text-foreground/50 mt-1">
          Manage your notifications, push setup, and roadmap data.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <PushNotificationSetup
          pushEnabled={settings.push_enabled}
          vapidPublicKey={VAPID_PUBLIC_KEY}
          onSubscribed={handleSubscribed}
        />

        <NotificationPrefs
          initial={settings.notify_prefs}
          onSave={handleSavePrefs}
        />

        <RoadmapImport
          current={settings.roadmap_data}
          onImport={handleImportRoadmap}
        />
      </div>
    </div>
  );
}
