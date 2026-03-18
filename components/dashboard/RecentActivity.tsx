"use client";

import { Github, Code2, FlaskConical, Map, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityEntry {
  id: string;
  type: string;
  xp_earned: number;
  logged_at: string;
  source_id: string | null;
  duration_mins: number | null;
  notes: string | null;
}

interface RecentActivityProps {
  entries: ActivityEntry[];
}

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Github; label: string; color: string }
> = {
  github: { icon: Github, label: "GitHub", color: "text-foreground" },
  leetcode: { icon: Code2, label: "LeetCode", color: "text-amber-500" },
  kaggle: { icon: FlaskConical, label: "Kaggle", color: "text-blue-500" },
  roadmap: { icon: Map, label: "Roadmap", color: "text-emerald-500" },
  manual: { icon: PenLine, label: "Manual", color: "text-muted-foreground" },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No activity logged yet. Start a session to see your progress here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => {
            const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.manual;
            const Icon = config.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 text-sm"
              >
                <div
                  className={`mt-0.5 flex-shrink-0 rounded-md bg-muted p-1.5 ${config.color}`}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {config.label}
                      {entry.source_id && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          &middot; {entry.source_id}
                        </span>
                      )}
                    </span>
                    <span className="flex-shrink-0 text-xs text-emerald-500 font-medium">
                      +{entry.xp_earned} XP
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">
                      {entry.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.logged_at)}
                    </span>
                    {entry.duration_mins && (
                      <span className="text-xs text-muted-foreground">
                        &middot; {entry.duration_mins}min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
