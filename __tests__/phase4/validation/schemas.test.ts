import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the schemas from the source files since they're not exported.
// These mirror the exact schemas defined in the source code.

// From app/api/notify/subscribe/route.ts
const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// From app/api/notify/snooze/route.ts
const SnoozeSchema = z.object({
  minutes: z.number().int().min(1).max(480),
});

// From lib/ai.ts
const QuantIdeaSchema = z.object({
  title: z.string(),
  hypothesis: z.string(),
  dataset: z.string(),
  methodology: z.string(),
  eval_metric: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

const MicroTaskSchema = z.object({
  task_description: z.string(),
  resource_link: z.string(),
  hands_on_exercise: z.string(),
});

describe("SubscriptionSchema", () => {
  it("accepts valid subscription", () => {
    const result = SubscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "valid-p256dh-key", auth: "valid-auth-key" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects bad URL", () => {
    const result = SubscriptionSchema.safeParse({
      endpoint: "not-a-url",
      keys: { p256dh: "key", auth: "key" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing keys", () => {
    const result = SubscriptionSchema.safeParse({
      endpoint: "https://push.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty p256dh key", () => {
    const result = SubscriptionSchema.safeParse({
      endpoint: "https://push.example.com",
      keys: { p256dh: "", auth: "valid" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty auth key", () => {
    const result = SubscriptionSchema.safeParse({
      endpoint: "https://push.example.com",
      keys: { p256dh: "valid", auth: "" },
    });
    expect(result.success).toBe(false);
  });
});

describe("SnoozeSchema", () => {
  it("accepts valid minutes (30)", () => {
    const result = SnoozeSchema.safeParse({ minutes: 30 });
    expect(result.success).toBe(true);
  });

  it("accepts boundary value 1", () => {
    const result = SnoozeSchema.safeParse({ minutes: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts boundary value 480", () => {
    const result = SnoozeSchema.safeParse({ minutes: 480 });
    expect(result.success).toBe(true);
  });

  it("rejects 0", () => {
    const result = SnoozeSchema.safeParse({ minutes: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects -1", () => {
    const result = SnoozeSchema.safeParse({ minutes: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects 481", () => {
    const result = SnoozeSchema.safeParse({ minutes: 481 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer (30.5)", () => {
    const result = SnoozeSchema.safeParse({ minutes: 30.5 });
    expect(result.success).toBe(false);
  });
});

describe("QuantIdeaSchema", () => {
  it("accepts valid quant idea", () => {
    const result = QuantIdeaSchema.safeParse({
      title: "Momentum Factor Timing",
      hypothesis: "ML models can predict regime changes",
      dataset: "CRSP daily returns",
      methodology: "Random forest on rolling features",
      eval_metric: "Sharpe ratio improvement",
      difficulty: "intermediate",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid difficulty", () => {
    const result = QuantIdeaSchema.safeParse({
      title: "Test",
      hypothesis: "Test",
      dataset: "Test",
      methodology: "Test",
      eval_metric: "Test",
      difficulty: "expert",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all three difficulty levels", () => {
    for (const diff of ["beginner", "intermediate", "advanced"]) {
      const result = QuantIdeaSchema.safeParse({
        title: "T",
        hypothesis: "H",
        dataset: "D",
        methodology: "M",
        eval_metric: "E",
        difficulty: diff,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("MicroTaskSchema", () => {
  it("accepts valid micro task", () => {
    const result = MicroTaskSchema.safeParse({
      task_description: "Build REST API",
      resource_link: "https://example.com",
      hands_on_exercise: "Create endpoints",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing task_description", () => {
    const result = MicroTaskSchema.safeParse({
      resource_link: "https://example.com",
      hands_on_exercise: "Exercise",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing resource_link", () => {
    const result = MicroTaskSchema.safeParse({
      task_description: "Task",
      hands_on_exercise: "Exercise",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing hands_on_exercise", () => {
    const result = MicroTaskSchema.safeParse({
      task_description: "Task",
      resource_link: "https://example.com",
    });
    expect(result.success).toBe(false);
  });
});
