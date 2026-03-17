import { describe, it, expect } from "vitest";
import type {
  User,
  NotifyPrefs,
  PushSubscription,
  RoadmapData,
  ModuleChannel,
  ActivityType,
  DeliveryMethod,
  DifficultyLevel,
} from "@/types/database";

describe("Database types", () => {
  it("User row has required fields", () => {
    const user: User = {
      id: "uuid-1",
      github_id: "12345",
      email: "test@example.com",
      github_token: "ghp_token",
      push_subscription: null,
      notify_prefs: null,
      roadmap_data: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(user.id).toBe("uuid-1");
    expect(user.github_id).toBe("12345");
    expect(user.email).toBe("test@example.com");
  });

  it("User allows nullable fields", () => {
    const user: User = {
      id: "uuid-2",
      github_id: "99",
      email: null,
      github_token: null,
      push_subscription: null,
      notify_prefs: null,
      roadmap_data: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    expect(user.email).toBeNull();
    expect(user.github_token).toBeNull();
    expect(user.push_subscription).toBeNull();
    expect(user.notify_prefs).toBeNull();
    expect(user.roadmap_data).toBeNull();
  });

  it("NotifyPrefs has all required fields", () => {
    const prefs: NotifyPrefs = {
      enabled: true,
      deliveryMethods: ["push", "email"],
      enabledModules: ["github", "leetcode"],
    };
    expect(prefs.enabled).toBe(true);
    expect(prefs.deliveryMethods).toHaveLength(2);
    expect(prefs.enabledModules).toContain("github");
  });

  it("NotifyPrefs supports optional quiet hours", () => {
    const prefs: NotifyPrefs = {
      enabled: true,
      deliveryMethods: ["push"],
      enabledModules: ["github"],
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };
    expect(prefs.quietHoursStart).toBe("22:00");
    expect(prefs.quietHoursEnd).toBe("07:00");
  });

  it("PushSubscription has endpoint and keys", () => {
    const sub: PushSubscription = {
      endpoint: "https://push.example.com/sub1",
      keys: {
        p256dh: "key1",
        auth: "key2",
      },
    };
    expect(sub.endpoint).toContain("https://");
    expect(sub.keys.p256dh).toBeTruthy();
    expect(sub.keys.auth).toBeTruthy();
  });

  it("RoadmapData has goals array with proper structure", () => {
    const data: RoadmapData = {
      goals: [
        {
          id: "g1",
          title: "Learn TS",
          targetDate: "2025-06-01",
          completed: false,
          completion_pct: 50,
        },
        {
          id: "g2",
          title: "Done goal",
          completed: true,
        },
      ],
      currentPhase: "Phase 1",
    };
    expect(data.goals).toHaveLength(2);
    expect(data.goals[0].completion_pct).toBe(50);
    expect(data.goals[1].completed).toBe(true);
    expect(data.currentPhase).toBe("Phase 1");
  });

  it("RoadmapData works without optional fields", () => {
    const data: RoadmapData = {
      goals: [],
    };
    expect(data.goals).toHaveLength(0);
    expect(data.currentPhase).toBeUndefined();
  });

  it("ModuleChannel covers all four channels", () => {
    const channels: ModuleChannel[] = [
      "github",
      "kaggle",
      "roadmap",
      "leetcode",
    ];
    expect(channels).toHaveLength(4);
  });

  it("ActivityType covers all five types", () => {
    const types: ActivityType[] = [
      "github",
      "kaggle",
      "roadmap",
      "leetcode",
      "manual",
    ];
    expect(types).toHaveLength(5);
  });

  it("DeliveryMethod covers all three methods", () => {
    const methods: DeliveryMethod[] = ["push", "email", "in_app"];
    expect(methods).toHaveLength(3);
  });

  it("DifficultyLevel covers all three levels", () => {
    const levels: DifficultyLevel[] = [
      "beginner",
      "intermediate",
      "advanced",
    ];
    expect(levels).toHaveLength(3);
  });
});
