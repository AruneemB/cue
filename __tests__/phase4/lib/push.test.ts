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
