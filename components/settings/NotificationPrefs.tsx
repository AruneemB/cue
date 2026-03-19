"use client";

import { useState } from "react";
import { Bell, Save } from "lucide-react";
import type { NotifyPrefs, ModuleChannel, DeliveryMethod } from "@/types/database";

interface NotificationPrefsProps {
  initial: NotifyPrefs;
  onSave: (prefs: NotifyPrefs) => Promise<boolean>;
}

const MODULE_OPTIONS: { value: ModuleChannel; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "kaggle", label: "Kaggle" },
  { value: "roadmap", label: "Roadmap" },
  { value: "leetcode", label: "LeetCode" },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "push", label: "Push Notifications" },
  { value: "email", label: "Email Digest" },
  { value: "in_app", label: "In-App" },
];

export function NotificationPrefs({ initial, onSave }: NotificationPrefsProps) {
  const [prefs, setPrefs] = useState<NotifyPrefs>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleModule(mod: ModuleChannel) {
    setPrefs((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(mod)
        ? prev.enabledModules.filter((m) => m !== mod)
        : [...prev.enabledModules, mod],
    }));
    setSaved(false);
  }

  function toggleDelivery(method: DeliveryMethod) {
    setPrefs((prev) => ({
      ...prev,
      deliveryMethods: prev.deliveryMethods.includes(method)
        ? prev.deliveryMethods.filter((m) => m !== method)
        : [...prev.deliveryMethods, method],
    }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const ok = await onSave(prefs);
    setSaving(false);
    if (ok) setSaved(true);
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Bell size={18} />
        <h2 className="text-sm font-semibold">Notification Preferences</h2>
      </div>

      {/* Master toggle */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-foreground/70">Notifications enabled</span>
        <input
          type="checkbox"
          checked={prefs.enabled}
          onChange={(e) => {
            setPrefs((p) => ({ ...p, enabled: e.target.checked }));
            setSaved(false);
          }}
          className="h-4 w-4 rounded accent-emerald-500"
        />
      </label>

      {/* Delivery methods */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground/50">Delivery Methods</span>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleDelivery(value)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                prefs.deliveryMethods.includes(value)
                  ? "bg-emerald-600 text-white"
                  : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Enabled modules */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground/50">Enabled Channels</span>
        <div className="flex flex-wrap gap-2">
          {MODULE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleModule(value)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                prefs.enabledModules.includes(value)
                  ? "bg-emerald-600 text-white"
                  : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quiet hours */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground/50">Quiet Hours</span>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="time"
            value={prefs.quietHoursStart ?? ""}
            onChange={(e) => {
              setPrefs((p) => ({ ...p, quietHoursStart: e.target.value || undefined }));
              setSaved(false);
            }}
            className="rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs"
          />
          <span className="text-foreground/40">to</span>
          <input
            type="time"
            value={prefs.quietHoursEnd ?? ""}
            onChange={(e) => {
              setPrefs((p) => ({ ...p, quietHoursEnd: e.target.value || undefined }));
              setSaved(false);
            }}
            className="rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs"
          />
        </div>
        <p className="text-xs text-foreground/30">
          No notifications will be sent during quiet hours.
        </p>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        <Save size={14} />
        {saving ? "Saving..." : saved ? "Saved" : "Save Preferences"}
      </button>
    </div>
  );
}
