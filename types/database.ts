// ── String literal union types ──────────────────────────────
export type ActivityType =
  | "leetcode"
  | "kaggle"
  | "github_commit"
  | "github_pr"
  | "study"
  | "exercise"
  | "journal";

export type NotificationChannel = "push" | "email" | "in_app";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// ── JSONB column interfaces ────────────────────────────────
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotifyPrefs {
  enabled: boolean;
  channels: NotificationChannel[];
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string;   // HH:MM
}

export interface RoadmapData {
  goals: {
    id: string;
    title: string;
    targetDate?: string;
    completed: boolean;
  }[];
  currentPhase?: string;
}

// ── Supabase Database type ─────────────────────────────────
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          github_id: string;
          email: string | null;
          github_token: string | null;
          push_subscription: PushSubscription | null;
          notify_prefs: NotifyPrefs | null;
          roadmap_data: RoadmapData | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          github_id: string;
          email?: string | null;
          github_token?: string | null;
          push_subscription?: PushSubscription | null;
          notify_prefs?: NotifyPrefs | null;
          roadmap_data?: RoadmapData | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          github_id?: string;
          email?: string | null;
          github_token?: string | null;
          push_subscription?: PushSubscription | null;
          notify_prefs?: NotifyPrefs | null;
          roadmap_data?: RoadmapData | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          xp_earned: number;
          logged_at: string;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          xp_earned?: number;
          logged_at?: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          xp_earned?: number;
          logged_at?: string;
          metadata?: Record<string, unknown> | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          title: string;
          body: string;
          delivered_at: string;
          clicked_at: string | null;
          snoozed_until: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          title: string;
          body: string;
          delivered_at?: string;
          clicked_at?: string | null;
          snoozed_until?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          channel?: string;
          title?: string;
          body?: string;
          delivered_at?: string;
          clicked_at?: string | null;
          snoozed_until?: string | null;
        };
      };
      kaggle_ideas: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          url: string | null;
          difficulty: string | null;
          tags: string[] | null;
          saved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          url?: string | null;
          difficulty?: string | null;
          tags?: string[] | null;
          saved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          url?: string | null;
          difficulty?: string | null;
          tags?: string[] | null;
          saved?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ── Helper type aliases ────────────────────────────────────
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];
export type HabitLogInsert = Database["public"]["Tables"]["habit_logs"]["Insert"];
export type HabitLogUpdate = Database["public"]["Tables"]["habit_logs"]["Update"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export type KaggleIdea = Database["public"]["Tables"]["kaggle_ideas"]["Row"];
export type KaggleIdeaInsert = Database["public"]["Tables"]["kaggle_ideas"]["Insert"];
export type KaggleIdeaUpdate = Database["public"]["Tables"]["kaggle_ideas"]["Update"];
