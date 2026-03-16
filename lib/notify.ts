import type { ModuleChannel, NotifyPrefs } from "@/types/database";

const ALL_CHANNELS: ModuleChannel[] = [
  "github",
  "kaggle",
  "roadmap",
  "leetcode",
];

/**
 * Pick the notification channel based on time-weighted rotation.
 *
 * Schedule (spec Section 7):
 *   08:00–11:59 → leetcode  (sharp morning focus)
 *   12:00–16:59 → github    (afternoon momentum)
 *   17:00–21:59 → kaggle or roadmap (creative / learning, alternating)
 *   22:00–07:59 → round-robin fallback
 *
 * If the user has enabledModules set, the picked channel is filtered
 * against that list. Falls back to the first enabled module.
 */
export function pickChannel(
  prefs: NotifyPrefs | null,
  now: Date = new Date()
): ModuleChannel {
  const hour = now.getUTCHours();
  const enabled = prefs?.enabledModules ?? ALL_CHANNELS;

  let preferred: ModuleChannel;

  if (hour >= 8 && hour < 12) {
    preferred = "leetcode";
  } else if (hour >= 12 && hour < 17) {
    preferred = "github";
  } else if (hour >= 17 && hour < 22) {
    // Alternate between kaggle and roadmap based on even/odd hour
    preferred = hour % 2 === 0 ? "kaggle" : "roadmap";
  } else {
    // Off-hours: cycle through channels based on the hour
    preferred = ALL_CHANNELS[hour % ALL_CHANNELS.length];
  }

  // Respect user's enabled modules
  if (enabled.includes(preferred)) {
    return preferred;
  }

  // Fallback to first enabled module
  return enabled[0] ?? "github";
}

/**
 * Check if the current time falls within the user's quiet hours.
 * Returns true if notifications should be suppressed.
 */
export function isQuietHour(
  prefs: NotifyPrefs | null,
  now: Date = new Date()
): boolean {
  if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;

  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);

  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start <= end) {
    // e.g. 22:00 – 23:00 (same day)
    return currentMinutes >= start && currentMinutes < end;
  }
  // Wraps midnight, e.g. 22:00 – 07:00
  return currentMinutes >= start || currentMinutes < end;
}
