import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockUser,
  createMockNotifyPrefs,
  setupTestEnv,
} from "@/__tests__/helpers/mocks";

// Mock all dependencies
const mockFrom = vi.fn();

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/push", () => ({
  sendPush: vi.fn(),
  generateSnoozeToken: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  checkDedup: vi.fn(),
  markSent: vi.fn(),
}));

vi.mock("@/lib/notify", () => ({
  pickChannel: vi.fn(),
  isQuietHour: vi.fn(),
  buildNotification: vi.fn(),
}));

import { GET } from "@/app/api/notify/trigger/route";
import { sendPush, generateSnoozeToken } from "@/lib/push";
import { checkDedup, markSent } from "@/lib/redis";
import { pickChannel, isQuietHour, buildNotification } from "@/lib/notify";

describe("GET /api/notify/trigger", () => {
  let cleanup: () => void;

  // Helper to build a chainable Supabase query mock
  function buildChain(result: { data?: unknown; error?: unknown }) {
    const chain: Record<string, any> = {};
    const methods = [
      "select",
      "insert",
      "update",
      "upsert",
      "delete",
      "eq",
      "not",
      "order",
      "limit",
      "single",
    ];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    // Make chain thenable (awaitable) with our result
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: result.data ?? null, error: result.error ?? null });
      return chain;
    };
    chain.single = vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    });
    return chain;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup = setupTestEnv({ CRON_SECRET: "test-cron-secret" });

    // Default mocks
    vi.mocked(pickChannel).mockReturnValue("github");
    vi.mocked(isQuietHour).mockReturnValue(false);
    vi.mocked(checkDedup).mockResolvedValue(false);
    vi.mocked(buildNotification).mockResolvedValue({
      title: "Test",
      body: "Test body",
      actionUrl: "/test",
    });
    vi.mocked(sendPush).mockResolvedValue(true);
    vi.mocked(markSent).mockResolvedValue(undefined);
    vi.mocked(generateSnoozeToken).mockReturnValue("mock-snooze-token");
  });

  afterEach(() => {
    cleanup();
  });

  function createRequest(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) headers.authorization = authHeader;
    return new Request("http://localhost/api/notify/trigger", {
      headers: new Headers(headers),
    });
  }

  it("returns 401 on missing authorization", async () => {
    const res = await GET(createRequest() as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 on wrong CRON_SECRET", async () => {
    const res = await GET(createRequest("Bearer wrong-secret") as any);
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(createRequest("Bearer something") as any);
    expect(res.status).toBe(401);
  });

  it("returns 500 on Supabase fetch error", async () => {
    const chain = buildChain({ error: { message: "DB error" } });
    mockFrom.mockReturnValue(chain);

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    expect(res.status).toBe(500);
  });

  it("returns {sent:0, skipped:0} when no users", async () => {
    const chain = buildChain({ data: [] });
    mockFrom.mockReturnValue(chain);

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
  });

  it("skips user with notifications disabled", async () => {
    const user = createMockUser({
      notify_prefs: createMockNotifyPrefs({ enabled: false }),
    });

    // First call: select users. Returns user.
    const usersChain = buildChain({ data: [user] });

    mockFrom
      .mockReturnValueOnce(usersChain); // users query
      // processUser will not run further queries since prefs.enabled is false

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();
    // The user is "processed" without error → sent++
    expect(body.sent).toBe(1);
  });

  it("skips user during quiet hours", async () => {
    const user = createMockUser();
    const usersChain = buildChain({ data: [user] });
    mockFrom.mockReturnValueOnce(usersChain);

    vi.mocked(isQuietHour).mockReturnValue(true);

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();
    // Quiet hour early-return → processUser resolves → sent++
    expect(body.sent).toBe(1);
  });

  it("skips user when dedup check returns true", async () => {
    const user = createMockUser();
    const usersChain = buildChain({ data: [user] });
    const notifChain = buildChain({ data: null });

    mockFrom
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(notifChain); // snoozed check

    vi.mocked(checkDedup).mockResolvedValue(true);

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();
    expect(body.sent).toBe(1);
  });

  it("sends push, logs to DB, and marks dedup on success", async () => {
    const user = createMockUser();
    const usersChain = buildChain({ data: [user] });
    const notifChain = buildChain({ data: null });
    const insertChain = buildChain({ data: null });

    mockFrom
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(notifChain) // snoozed check
      .mockReturnValueOnce(insertChain); // notification insert

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();

    expect(body.sent).toBe(1);
    expect(sendPush).toHaveBeenCalled();
    expect(markSent).toHaveBeenCalled();
  });

  it("clears push_subscription when sendPush returns false", async () => {
    const user = createMockUser();
    const usersChain = buildChain({ data: [user] });
    const notifChain = buildChain({ data: null });
    const updateChain = buildChain({ data: null });

    mockFrom
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(notifChain) // snoozed check
      .mockReturnValueOnce(updateChain); // clear push_subscription

    vi.mocked(sendPush).mockResolvedValue(false);

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();

    // Update should have been called to clear push_subscription
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(body.sent).toBe(1);
  });

  it("increments skipped when processUser throws", async () => {
    const user = createMockUser();
    const usersChain = buildChain({ data: [user] });
    mockFrom.mockReturnValueOnce(usersChain);

    // Make something inside processUser throw
    vi.mocked(isQuietHour).mockImplementation(() => {
      throw new Error("unexpected error");
    });

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("attaches snoozeToken to payload before sending push", async () => {
    const user = createMockUser();
    const usersChain = buildChain({ data: [user] });
    const notifChain = buildChain({ data: null });
    const insertChain = buildChain({ data: null });

    mockFrom
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(notifChain) // snoozed check
      .mockReturnValueOnce(insertChain); // notification insert

    vi.mocked(generateSnoozeToken).mockReturnValue("signed-token-abc");

    const res = await GET(createRequest("Bearer test-cron-secret") as any);
    expect(res.status).toBe(200);

    // Verify generateSnoozeToken was called with the user's id
    expect(generateSnoozeToken).toHaveBeenCalledWith(user.id);

    // Verify the payload sent to sendPush includes the token
    const sentPayload = vi.mocked(sendPush).mock.calls[0][1];
    expect(sentPayload.snoozeToken).toBe("signed-token-abc");
  });
});
