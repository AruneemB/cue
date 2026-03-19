import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the schema from app/api/habits/log/route.ts since it's not exported.
// This mirrors the exact schema defined in the source code.

const HabitLogSchema = z.object({
  type: z.enum(["github", "kaggle", "roadmap", "leetcode", "manual"]),
  source_id: z.string().max(255).optional(),
  duration_mins: z.number().int().min(1).max(1440).optional(),
  notes: z.string().max(2000).optional(),
});

describe("HabitLogSchema", () => {
  // ── Valid inputs ─────────────────────────────────────────

  it("accepts minimal valid input (type only)", () => {
    const result = HabitLogSchema.safeParse({ type: "github" });
    expect(result.success).toBe(true);
  });

  it("accepts all five valid activity types", () => {
    for (const type of ["github", "kaggle", "roadmap", "leetcode", "manual"]) {
      const result = HabitLogSchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });

  it("accepts full input with all optional fields", () => {
    const result = HabitLogSchema.safeParse({
      type: "manual",
      source_id: "my-project",
      duration_mins: 30,
      notes: "Worked on the API",
    });
    expect(result.success).toBe(true);
  });

  it("accepts github type with source_id", () => {
    const result = HabitLogSchema.safeParse({
      type: "github",
      source_id: "user/my-repo",
    });
    expect(result.success).toBe(true);
  });

  // ── Type validation ────────────────────────────────────────

  it("rejects invalid type value", () => {
    const result = HabitLogSchema.safeParse({ type: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string type", () => {
    const result = HabitLogSchema.safeParse({ type: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = HabitLogSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects numeric type", () => {
    const result = HabitLogSchema.safeParse({ type: 1 });
    expect(result.success).toBe(false);
  });

  // ── duration_mins validation ───────────────────────────────

  it("accepts duration_mins boundary value 1", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts duration_mins boundary value 1440", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: 1440 });
    expect(result.success).toBe(true);
  });

  it("rejects duration_mins of 0 (below minimum)", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects duration_mins of -1 (negative)", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects duration_mins of 1441 (above maximum)", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: 1441 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer duration_mins (30.5)", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: 30.5 });
    expect(result.success).toBe(false);
  });

  it("rejects string duration_mins", () => {
    const result = HabitLogSchema.safeParse({ type: "manual", duration_mins: "30" });
    expect(result.success).toBe(false);
  });

  // ── source_id validation ───────────────────────────────────

  it("accepts source_id at max length (255 chars)", () => {
    const result = HabitLogSchema.safeParse({
      type: "github",
      source_id: "x".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("rejects source_id exceeding 255 characters", () => {
    const result = HabitLogSchema.safeParse({
      type: "github",
      source_id: "x".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string source_id", () => {
    const result = HabitLogSchema.safeParse({
      type: "github",
      source_id: "",
    });
    expect(result.success).toBe(true);
  });

  // ── notes validation ───────────────────────────────────────

  it("accepts notes at max length (2000 chars)", () => {
    const result = HabitLogSchema.safeParse({
      type: "manual",
      notes: "x".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 2000 characters", () => {
    const result = HabitLogSchema.safeParse({
      type: "manual",
      notes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string notes", () => {
    const result = HabitLogSchema.safeParse({
      type: "manual",
      notes: "",
    });
    expect(result.success).toBe(true);
  });

  // ── Extra fields ───────────────────────────────────────────

  it("strips unknown extra fields", () => {
    const result = HabitLogSchema.safeParse({
      type: "github",
      extra_field: "should be ignored",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("extra_field");
    }
  });
});
