"use client";

import { useEffect, useState } from "react";
import { HeatmapCalendar } from "@/components/dashboard/HeatmapCalendar";
import { StreakCard } from "@/components/dashboard/StreakCard";
import { XPBar } from "@/components/dashboard/XPBar";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

interface HeatmapEntry {
  date: string;
  xp: number;
}

interface ActivityEntry {
  id: string;
  type: string;
  xp_earned: number;
  logged_at: string;
  source_id: string | null;
  duration_mins: number | null;
  notes: string | null;
}

interface StatsResponse {
  total_xp: number;
  level: number;
  level_progress: number;
  xp_to_next_level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  heatmap: HeatmapEntry[];
  channel_breakdown: Record<string, { count: number; xp: number }>;
  recent_activity: ActivityEntry[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/habits/stats");
        if (!res.ok) {
          throw new Error(`Failed to fetch stats (${res.status})`);
        }
        const data: StatsResponse = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-destructive">
          {error ?? "Unable to load dashboard data."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Top row: XP + Streaks */}
      <div className="grid gap-4 md:grid-cols-2">
        <XPBar
          totalXP={stats.total_xp}
          level={stats.level}
          levelProgress={stats.level_progress}
          xpToNextLevel={stats.xp_to_next_level}
        />
        <StreakCard
          currentStreak={stats.current_streak}
          longestStreak={stats.longest_streak}
          lastActiveDate={stats.last_active_date}
        />
      </div>

      {/* Heatmap: full width */}
      <HeatmapCalendar data={stats.heatmap} />

      {/* Recent activity */}
      <RecentActivity entries={stats.recent_activity} />
    </div>
  );
}
