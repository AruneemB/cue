import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockFetchResponse,
  createMockQuantIdea,
  createMockMicroTask,
  setupTestEnv,
} from "@/__tests__/helpers/mocks";

import {
  sampleTheme,
  generateQuantIdea,
  formatQuantIdeaText,
  formatMicroTaskText,
  generateMicroTask,
} from "@/lib/ai";

describe("sampleTheme", () => {
  it("returns a valid theme string", () => {
    const theme = sampleTheme();
    expect(typeof theme).toBe("string");
    expect(theme.length).toBeGreaterThan(0);
  });

  it("excludes specified themes", () => {
    // Exclude all but one theme to force a deterministic result
    const allThemes = Array.from({ length: 50 }, () => sampleTheme());
    const unique = [...new Set(allThemes)];

    // With enough samples, we should see at least a couple different themes
    expect(unique.length).toBeGreaterThan(1);
  });

  it("falls back to full list when all excluded", () => {
    // Pass a huge exclude list - should still return something
    const exclude = Array.from({ length: 100 }, (_, i) => `theme-${i}`);
    const theme = sampleTheme(exclude);
    expect(typeof theme).toBe("string");
    expect(theme.length).toBeGreaterThan(0);
  });
});

describe("generateQuantIdea", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup = setupTestEnv();
  });

  afterEach(() => {
    cleanup();
  });

  it("calls OpenRouter with correct model and prompt", async () => {
    const idea = createMockQuantIdea();
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [{ message: { content: JSON.stringify(idea) } }],
      })
    );

    await generateQuantIdea("test theme");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-openrouter-key",
          "Content-Type": "application/json",
        }),
      })
    );

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.max_tokens).toBe(1024);
    expect(body.messages[1].content).toContain("test theme");
  });

  it("parses valid JSON response with Zod validation", async () => {
    const idea = createMockQuantIdea();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [{ message: { content: JSON.stringify(idea) } }],
      })
    );

    const result = await generateQuantIdea();
    expect(result).toEqual(idea);
  });

  it("strips markdown fences from response", async () => {
    const idea = createMockQuantIdea();
    const wrapped = "```json\n" + JSON.stringify(idea) + "\n```";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [{ message: { content: wrapped } }],
      })
    );

    const result = await generateQuantIdea();
    expect(result).toEqual(idea);
  });

  it("returns null on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({}, { status: 500, ok: false })
    );

    const result = await generateQuantIdea();
    expect(result).toBeNull();
  });

  it("returns null on validation failure (invalid difficulty)", async () => {
    const badIdea = { ...createMockQuantIdea(), difficulty: "expert" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [{ message: { content: JSON.stringify(badIdea) } }],
      })
    );

    const result = await generateQuantIdea();
    expect(result).toBeNull();
  });
});

describe("formatQuantIdeaText", () => {
  it("formats idea text correctly", () => {
    const idea = createMockQuantIdea({
      title: "Alpha Signals",
      hypothesis: "Momentum predicts returns",
    });
    const text = formatQuantIdeaText(idea);
    expect(text).toBe(
      "Quant idea: Alpha Signals — Momentum predicts returns. Tap to expand."
    );
  });
});

describe("formatMicroTaskText", () => {
  it("formats micro task text correctly", () => {
    const task = createMockMicroTask({
      task_description: "Build REST API endpoints",
    });
    const text = formatMicroTaskText("Node.js", task);
    expect(text).toBe(
      "Roadmap: Work on Node.js. Today's task: Build REST API endpoints"
    );
  });
});

describe("generateMicroTask", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup = setupTestEnv();
  });

  afterEach(() => {
    cleanup();
  });

  it("includes nodeName and roadmapName in prompt", async () => {
    const task = createMockMicroTask();
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [{ message: { content: JSON.stringify(task) } }],
      })
    );

    await generateMicroTask("React Hooks", "Frontend Mastery");

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as RequestInit).body as string
    );
    expect(body.messages[1].content).toContain("React Hooks");
    expect(body.messages[1].content).toContain("Frontend Mastery");
  });

  it("returns parsed MicroTask on success", async () => {
    const task = createMockMicroTask();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [{ message: { content: JSON.stringify(task) } }],
      })
    );

    const result = await generateMicroTask("React", "Frontend");
    expect(result).toEqual(task);
  });

  it("returns null on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({}, { status: 500, ok: false })
    );

    const result = await generateMicroTask("React", "Frontend");
    expect(result).toBeNull();
  });

  it("returns null on validation failure (missing fields)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createMockFetchResponse({
        choices: [
          { message: { content: JSON.stringify({ task_description: "only" }) } },
        ],
      })
    );

    const result = await generateMicroTask("React", "Frontend");
    expect(result).toBeNull();
  });
});
