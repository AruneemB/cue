"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapDay {
  date: string; // YYYY-MM-DD
  xp: number;
}

interface HeatmapCalendarProps {
  data: HeatmapDay[];
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Map XP value to an intensity level (0–4) for coloring */
function getIntensity(xp: number, max: number): number {
  if (xp === 0) return 0;
  if (max === 0) return 0;
  const ratio = xp / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const INTENSITY_CLASSES = [
  "bg-muted",                           // 0: no activity
  "bg-emerald-200 dark:bg-emerald-900", // 1: low
  "bg-emerald-400 dark:bg-emerald-700", // 2: medium
  "bg-emerald-500 dark:bg-emerald-500", // 3: high
  "bg-emerald-600 dark:bg-emerald-400", // 4: max
];

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const { weeks, monthMarkers, maxXP } = useMemo(() => {
    // Build a lookup map
    const xpMap = new Map<string, number>();
    let maxXP = 0;
    for (const d of data) {
      xpMap.set(d.date, d.xp);
      if (d.xp > maxXP) maxXP = d.xp;
    }

    // Generate 52 weeks of days ending at today
    const today = new Date();
    const weeks: { date: string; xp: number; dayOfWeek: number }[][] = [];
    const monthMarkers: { weekIndex: number; label: string }[] = [];

    // Find the Sunday that starts the grid (52 weeks + partial current week ago)
    const todayDay = today.getUTCDay(); // 0=Sun
    const totalDays = 52 * 7 + todayDay + 1;
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - totalDays + 1);

    let currentWeek: { date: string; xp: number; dayOfWeek: number }[] = [];
    let lastMonth = -1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const dow = d.getUTCDay();
      const month = d.getUTCMonth();

      if (dow === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      // Track month boundaries
      if (month !== lastMonth) {
        monthMarkers.push({ weekIndex: weeks.length, label: MONTH_LABELS[month] });
        lastMonth = month;
      }

      currentWeek.push({ date: key, xp: xpMap.get(key) ?? 0, dayOfWeek: dow });
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return { weeks, monthMarkers, maxXP };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {monthMarkers.map((m, i) => {
              const nextWeek = monthMarkers[i + 1]?.weekIndex ?? weeks.length;
              const span = nextWeek - m.weekIndex;
              return (
                <span
                  key={`${m.label}-${m.weekIndex}`}
                  className="text-xs text-muted-foreground"
                  style={{ width: `${span * 14}px` }}
                >
                  {span >= 2 ? m.label : ""}
                </span>
              );
            })}
          </div>

          <div className="flex gap-0.5">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAY_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="text-[10px] text-muted-foreground leading-none h-[10px] flex items-center"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }, (_, dow) => {
                  const day = week.find((d) => d.dayOfWeek === dow);
                  if (!day) {
                    return <div key={dow} className="w-[10px] h-[10px]" />;
                  }
                  const intensity = getIntensity(day.xp, maxXP);
                  return (
                    <div
                      key={dow}
                      className={`w-[10px] h-[10px] rounded-sm ${INTENSITY_CLASSES[intensity]}`}
                      title={`${day.date}: ${day.xp} XP`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-[10px] text-muted-foreground mr-1">Less</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={`w-[10px] h-[10px] rounded-sm ${cls}`} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
