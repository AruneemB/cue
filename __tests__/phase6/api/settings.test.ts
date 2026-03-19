import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { GET, PATCH } from "@/app/api/settings/route";

// ── GET /api/settings ──────────────────────────────────────────

describe("GET /api/settings", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    });
    return chain;
  }

  function createRequest() {
    return new Request("http://localhost/api/settings");
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mockAuth.mockResolvedValue({ githubId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  // ── User not found ──────────────────────────────────────────

  it("returns 404 when user not found", async () => {
    const chain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  // ── Success with data ─────────────────────────────────────────

  it("returns user settings when found", async () => {
    const prefs = {
      enabled: true,
      deliveryMethods: ["push", "email"],
      enabledModules: ["github", "kaggle"],
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    };
    const roadmap = {
      goals: [{ id: "1", title: "Learn TS", completed: false }],
      currentPhase: "Frontend",
    };
    const chain = buildChain({
      data: {
        notify_prefs: prefs,
        roadmap_data: roadmap,
        push_subscription: { endpoint: "https://example.com" },
      },
    });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notify_prefs).toEqual(prefs);
    expect(body.roadmap_data).toEqual(roadmap);
    expect(body.push_enabled).toBe(true);
  });

  it("returns push_enabled=false when no push subscription", async () => {
    const chain = buildChain({
      data: {
        notify_prefs: null,
        roadmap_data: null,
        push_subscription: null,
      },
    });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(body.push_enabled).toBe(false);
  });

  // ── Default prefs ─────────────────────────────────────────────

  it("returns default prefs when user has no notify_prefs", async () => {
    const chain = buildChain({
      data: {
        notify_prefs: null,
        roadmap_data: null,
        push_subscription: null,
      },
    });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(body.notify_prefs).toEqual({
      enabled: true,
      deliveryMethods: ["push"],
      enabledModules: ["github", "kaggle", "roadmap", "leetcode"],
    });
  });

  it("returns null roadmap_data when user has none", async () => {
    const chain = buildChain({
      data: {
        notify_prefs: null,
        roadmap_data: null,
        push_subscription: null,
      },
    });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const body = await res.json();
    expect(body.roadmap_data).toBeNull();
  });

  // ── Query details ─────────────────────────────────────────────

  it("queries the users table with correct github_id", async () => {
    const chain = buildChain({
      data: { notify_prefs: null, roadmap_data: null, push_subscription: null },
    });
    mockFrom.mockReturnValue(chain);

    await GET();

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(chain.select).toHaveBeenCalledWith("notify_prefs, roadmap_data, push_subscription");
    expect(chain.eq).toHaveBeenCalledWith("github_id", "12345");
  });
});

// ── PATCH /api/settings ────────────────────────────────────────

describe("PATCH /api/settings", () => {
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    for (const m of ["select", "insert", "update", "upsert", "eq", "not", "order", "limit", "single"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    });
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: result.data ?? null, error: result.error ?? null });
      return chain;
    };
    return chain;
  }

  function createRequest(body?: unknown) {
    return new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : "invalid{",
    });
  }

  const validPrefs = {
    enabled: true,
    deliveryMethods: ["push", "email"],
    enabledModules: ["github", "kaggle"],
  };

  const validRoadmap = {
    goals: [
      { id: "1", title: "Learn TypeScript", completed: false, completion_pct: 40 },
      { id: "2", title: "Learn React", completed: true },
    ],
    currentPhase: "Frontend Mastery",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ githubId: "12345" });
  });

  // ── Authentication ─────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(createRequest({ notify_prefs: validPrefs }) as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mockAuth.mockResolvedValue({ githubId: undefined });
    const res = await PATCH(createRequest({ notify_prefs: validPrefs }) as any);
    expect(res.status).toBe(401);
  });

  // ── Invalid JSON ──────────────────────────────────────────

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: "{bad json",
    });
    const res = await PATCH(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  // ── Validation: empty body ─────────────────────────────────

  it("returns 400 when neither notify_prefs nor roadmap_data provided", async () => {
    const res = await PATCH(createRequest({}) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
  });

  // ── Validation: invalid notify_prefs ───────────────────────

  it("returns 400 when notify_prefs.enabled is missing", async () => {
    const res = await PATCH(
      createRequest({
        notify_prefs: { deliveryMethods: ["push"], enabledModules: ["github"] },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid delivery method", async () => {
    const res = await PATCH(
      createRequest({
        notify_prefs: {
          enabled: true,
          deliveryMethods: ["sms"],
          enabledModules: ["github"],
        },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid module channel", async () => {
    const res = await PATCH(
      createRequest({
        notify_prefs: {
          enabled: true,
          deliveryMethods: ["push"],
          enabledModules: ["twitter"],
        },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed quiet hours format", async () => {
    const res = await PATCH(
      createRequest({
        notify_prefs: {
          enabled: true,
          deliveryMethods: ["push"],
          enabledModules: ["github"],
          quietHoursStart: "10pm",
        },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  // ── Validation: invalid roadmap_data ───────────────────────

  it("returns 400 when goals array is empty", async () => {
    const res = await PATCH(
      createRequest({
        roadmap_data: { goals: [] },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when goal missing required fields", async () => {
    const res = await PATCH(
      createRequest({
        roadmap_data: { goals: [{ title: "No ID" }] },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when goal.completed is not boolean", async () => {
    const res = await PATCH(
      createRequest({
        roadmap_data: {
          goals: [{ id: "1", title: "Test", completed: "yes" }],
        },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when completion_pct exceeds 100", async () => {
    const res = await PATCH(
      createRequest({
        roadmap_data: {
          goals: [{ id: "1", title: "Test", completed: false, completion_pct: 150 }],
        },
      }) as any
    );
    expect(res.status).toBe(400);
  });

  // ── Validation: valid quiet hours ──────────────────────────

  it("accepts valid quiet hours format", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(
      createRequest({
        notify_prefs: {
          ...validPrefs,
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
        },
      }) as any
    );
    expect(res.status).toBe(200);
  });

  // ── Success: update notify_prefs only ──────────────────────

  it("updates notify_prefs and returns ok", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(createRequest({ notify_prefs: validPrefs }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.notify_prefs).toEqual(validPrefs);
  });

  it("calls update with correct notify_prefs payload", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    await PATCH(createRequest({ notify_prefs: validPrefs }) as any);

    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(chain.update).toHaveBeenCalledWith({ notify_prefs: validPrefs });
    expect(chain.eq).toHaveBeenCalledWith("github_id", "12345");
  });

  // ── Success: update roadmap_data only ──────────────────────

  it("updates roadmap_data and returns ok", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(createRequest({ roadmap_data: validRoadmap }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.roadmap_data).toEqual(validRoadmap);
  });

  it("calls update with correct roadmap_data payload", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    await PATCH(createRequest({ roadmap_data: validRoadmap }) as any);

    expect(chain.update).toHaveBeenCalledWith({ roadmap_data: validRoadmap });
  });

  // ── Success: update both ───────────────────────────────────

  it("updates both notify_prefs and roadmap_data together", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(
      createRequest({ notify_prefs: validPrefs, roadmap_data: validRoadmap }) as any
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.notify_prefs).toEqual(validPrefs);
    expect(body.roadmap_data).toEqual(validRoadmap);
  });

  it("passes both fields in a single update call", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    await PATCH(
      createRequest({ notify_prefs: validPrefs, roadmap_data: validRoadmap }) as any
    );

    expect(chain.update).toHaveBeenCalledWith({
      notify_prefs: validPrefs,
      roadmap_data: validRoadmap,
    });
  });

  // ── Database error ─────────────────────────────────────────

  it("returns 500 when database update fails", async () => {
    const chain = buildChain({ error: { message: "update failed" } });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(createRequest({ notify_prefs: validPrefs }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to save settings");
  });

  // ── Optional fields ────────────────────────────────────────

  it("accepts roadmap goals with optional fields omitted", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const minimalRoadmap = {
      goals: [{ id: "1", title: "Test Goal", completed: false }],
    };

    const res = await PATCH(createRequest({ roadmap_data: minimalRoadmap }) as any);
    expect(res.status).toBe(200);
  });

  it("accepts notify_prefs with empty arrays", async () => {
    const chain = buildChain({ data: null });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(
      createRequest({
        notify_prefs: {
          enabled: false,
          deliveryMethods: [],
          enabledModules: [],
        },
      }) as any
    );
    expect(res.status).toBe(200);
  });
});
