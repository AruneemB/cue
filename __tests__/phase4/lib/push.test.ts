import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockPushSubscription, setupTestEnv } from "@/__tests__/helpers/mocks";

const mockSetVapidDetails = vi.fn();
const mockSendNotification = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

describe("Push lib", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cleanup = setupTestEnv();
  });

  afterEach(() => {
    cleanup();
  });

  async function importPush() {
    vi.doMock("web-push", () => ({
      default: {
        setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
        sendNotification: (...args: unknown[]) =>
          mockSendNotification(...args),
      },
    }));
    return import("@/lib/push");
  }

  it("configures VAPID details on first call", async () => {
    mockSendNotification.mockResolvedValue({});
    const { sendPush } = await importPush();

    const sub = createMockPushSubscription();
    await sendPush(sub, {
      title: "Test",
      body: "Body",
      actionUrl: "/test",
    });

    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      "mailto:noreply@cue-app.vercel.app",
      "test-vapid-public-key",
      "test-vapid-private-key"
    );
  });

  it("configures VAPID only once (singleton)", async () => {
    mockSendNotification.mockResolvedValue({});
    const { sendPush } = await importPush();

    const sub = createMockPushSubscription();
    await sendPush(sub, { title: "T1", body: "B1", actionUrl: "/" });
    await sendPush(sub, { title: "T2", body: "B2", actionUrl: "/" });

    expect(mockSetVapidDetails).toHaveBeenCalledTimes(1);
  });

  it("passes correct subscription format to web-push", async () => {
    mockSendNotification.mockResolvedValue({});
    const { sendPush } = await importPush();

    const sub = createMockPushSubscription({
      endpoint: "https://push.example.com/sub",
      keys: { p256dh: "key-p256dh", auth: "key-auth" },
    });

    await sendPush(sub, { title: "T", body: "B", actionUrl: "/" });

    expect(mockSendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://push.example.com/sub",
        keys: { p256dh: "key-p256dh", auth: "key-auth" },
      },
      expect.any(String),
      { TTL: 3600 }
    );
  });

  it("sends JSON payload with TTL 3600", async () => {
    mockSendNotification.mockResolvedValue({});
    const { sendPush } = await importPush();

    const payload = { title: "Hello", body: "World", actionUrl: "/go" };
    await sendPush(createMockPushSubscription(), payload);

    const sentPayload = JSON.parse(
      mockSendNotification.mock.calls[0][1] as string
    );
    expect(sentPayload).toEqual(payload);
    expect(mockSendNotification.mock.calls[0][2]).toEqual({ TTL: 3600 });
  });

  it("returns true on success", async () => {
    mockSendNotification.mockResolvedValue({});
    const { sendPush } = await importPush();

    const result = await sendPush(createMockPushSubscription(), {
      title: "T",
      body: "B",
      actionUrl: "/",
    });
    expect(result).toBe(true);
  });

  it("returns false on 410 error (expired subscription)", async () => {
    mockSendNotification.mockRejectedValue({ statusCode: 410 });
    const { sendPush } = await importPush();

    const result = await sendPush(createMockPushSubscription(), {
      title: "T",
      body: "B",
      actionUrl: "/",
    });
    expect(result).toBe(false);
  });

  it("returns false on 404 error", async () => {
    mockSendNotification.mockRejectedValue({ statusCode: 404 });
    const { sendPush } = await importPush();

    const result = await sendPush(createMockPushSubscription(), {
      title: "T",
      body: "B",
      actionUrl: "/",
    });
    expect(result).toBe(false);
  });

  it("returns false on other errors", async () => {
    mockSendNotification.mockRejectedValue(new Error("Network failure"));
    const { sendPush } = await importPush();

    const result = await sendPush(createMockPushSubscription(), {
      title: "T",
      body: "B",
      actionUrl: "/",
    });
    expect(result).toBe(false);
  });

  it("getPublicVapidKey returns env var", async () => {
    const { getPublicVapidKey } = await importPush();
    expect(getPublicVapidKey()).toBe("test-vapid-public-key");
  });

  it("getPublicVapidKey throws if VAPID_PUBLIC_KEY missing", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const { getPublicVapidKey } = await importPush();
    expect(() => getPublicVapidKey()).toThrow(
      "Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY"
    );
  });
});

describe("Snooze tokens", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cleanup = setupTestEnv();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function importPush() {
    vi.doMock("web-push", () => ({
      default: {
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn(),
      },
    }));
    return import("@/lib/push");
  }

  it("generateSnoozeToken returns a colon-separated string", async () => {
    const { generateSnoozeToken } = await importPush();
    const token = generateSnoozeToken("user-123");
    const parts = token.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("user-123");
  });

  it("verifySnoozeToken returns userId for a valid token", async () => {
    const { generateSnoozeToken, verifySnoozeToken } = await importPush();
    const token = generateSnoozeToken("user-456");
    const result = verifySnoozeToken(token);
    expect(result).toBe("user-456");
  });

  it("verifySnoozeToken returns null for a tampered signature", async () => {
    const { generateSnoozeToken, verifySnoozeToken } = await importPush();
    const token = generateSnoozeToken("user-789");
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifySnoozeToken(tampered)).toBeNull();
  });

  it("verifySnoozeToken returns null for an expired token", async () => {
    const { generateSnoozeToken, verifySnoozeToken } = await importPush();

    // Generate a token, then advance time past expiry
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const token = generateSnoozeToken("user-exp");

    // Advance 25 hours (past the 24h TTL)
    vi.spyOn(Date, "now").mockReturnValue(now + 25 * 60 * 60 * 1000);
    expect(verifySnoozeToken(token)).toBeNull();
  });

  it("verifySnoozeToken returns null for garbage input", async () => {
    const { verifySnoozeToken } = await importPush();
    expect(verifySnoozeToken("")).toBeNull();
    expect(verifySnoozeToken("not-a-token")).toBeNull();
    expect(verifySnoozeToken("a:b")).toBeNull();
    expect(verifySnoozeToken("a:notanumber:sig")).toBeNull();
  });

  it("verifySnoozeToken returns null for wrong secret", async () => {
    const { generateSnoozeToken } = await importPush();
    const token = generateSnoozeToken("user-sec");

    // Change the secret
    process.env.CRON_SECRET = "different-secret";
    vi.resetModules();
    vi.doMock("web-push", () => ({
      default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
    }));
    const { verifySnoozeToken } = await import("@/lib/push");

    expect(verifySnoozeToken(token)).toBeNull();
  });

  it("generateSnoozeToken throws when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const { generateSnoozeToken } = await importPush();
    expect(() => generateSnoozeToken("user-x")).toThrow("Missing CRON_SECRET");
  });

  it("handles userId containing colons", async () => {
    const { generateSnoozeToken, verifySnoozeToken } = await importPush();
    const token = generateSnoozeToken("uuid:with:colons");
    expect(verifySnoozeToken(token)).toBe("uuid:with:colons");
  });
});
