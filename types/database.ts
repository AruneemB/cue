// ── String literal union types ──────────────────────────────
export type ActivityType =
  | "github"
  | "kaggle"
  | "roadmap"
  | "leetcode"
  | "manual";

/** The content module that triggered a notification */
export type ModuleChannel = "github" | "kaggle" | "roadmap" | "leetcode";

/** Delivery method for notifications */
export type DeliveryMethod = "push" | "email" | "in_app";

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
  deliveryMethods: DeliveryMethod[];
  enabledModules: ModuleChannel[];
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string;   // HH:MM
}

export interface RoadmapData {
  goals: {
    id: string;
    title: string;
    targetDate?: string;
    completed: boolean;
    completion_pct?: number; // 0-100, persisted across updates
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
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          xp_earned: number;
          logged_at: string;
          metadata: Record<string, unknown> | null;
          source_id: string | null;
          duration_mins: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          xp_earned?: number;
          logged_at?: string;
          metadata?: Record<string, unknown> | null;
          source_id?: string | null;
          duration_mins?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          xp_earned?: number;
          logged_at?: string;
          metadata?: Record<string, unknown> | null;
          source_id?: string | null;
          duration_mins?: number | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "habit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          title: string;
          body: string;
          action_url: string | null;
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
          action_url?: string | null;
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
          action_url?: string | null;
          delivered_at?: string;
          clicked_at?: string | null;
          snoozed_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      kaggle_ideas: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          url: string | null;
          hypothesis: string | null;
          dataset: string | null;
          methodology: string | null;
          eval_metric: string | null;
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
          hypothesis?: string | null;
          dataset?: string | null;
          methodology?: string | null;
          eval_metric?: string | null;
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
          hypothesis?: string | null;
          dataset?: string | null;
          methodology?: string | null;
          eval_metric?: string | null;
          difficulty?: string | null;
          tags?: string[] | null;
          saved?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kaggle_ideas_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
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
