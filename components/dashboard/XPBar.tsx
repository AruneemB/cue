"use client";

import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface XPBarProps {
  totalXP: number;
  level: number;
  levelProgress: number;
  xpToNextLevel: number;
}

export function XPBar({
  totalXP,
  level,
  levelProgress,
  xpToNextLevel,
}: XPBarProps) {
  const progressPercent =
    levelProgress + xpToNextLevel > 0
      ? (levelProgress / (levelProgress + xpToNextLevel)) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Experience</span>
          <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Star size={14} className="text-amber-500" />
            {totalXP.toLocaleString()} XP
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Level indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Level {level}</span>
            <span className="text-muted-foreground">
              {levelProgress} / {levelProgress + xpToNextLevel} XP
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* XP to next level */}
          <p className="text-xs text-muted-foreground text-right">
            {xpToNextLevel} XP to Level {level + 1}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
