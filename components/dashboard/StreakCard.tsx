"use client";

import { Flame, Trophy, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // ISO string
}

export function StreakCard({
  currentStreak,
  longestStreak,
  lastActiveDate,
}: StreakCardProps) {
  const formattedDate = lastActiveDate
    ? new Date(lastActiveDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No activity yet";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Streaks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Current streak */}
          <div className="flex flex-col items-center gap-1">
            <Flame
              size={24}
              className={
                currentStreak > 0
                  ? "text-orange-500"
                  : "text-muted-foreground"
              }
            />
            <span className="text-2xl font-bold">{currentStreak}</span>
            <span className="text-xs text-muted-foreground">Current</span>
          </div>

          {/* Longest streak */}
          <div className="flex flex-col items-center gap-1">
            <Trophy
              size={24}
              className={
                longestStreak > 0
                  ? "text-amber-500"
                  : "text-muted-foreground"
              }
            />
            <span className="text-2xl font-bold">{longestStreak}</span>
            <span className="text-xs text-muted-foreground">Longest</span>
          </div>

          {/* Last active */}
          <div className="flex flex-col items-center gap-1">
            <Calendar size={24} className="text-muted-foreground" />
            <span className="text-sm font-medium text-center leading-tight">
              {formattedDate}
            </span>
            <span className="text-xs text-muted-foreground">Last Active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
