import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupTestEnv, createMockFetchResponse } from "@/__tests__/helpers/mocks";

describe("Redis lib", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup = setupTestEnv();
  });

  afterEach(() => {
    cleanup();
  });

  describe("set", () => {
    it("sends SET command to Upstash", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: "OK" })
      );

      const { set } = await import("@/lib/redis");
      const result = await set("key1", "value1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.upstash.io",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-redis-token",
          }),
          body: JSON.stringify(["SET", "key1", "value1"]),
        })
      );
      expect(result).toBe("OK");
    });

    it("includes EX with ttl", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: "OK" })
      );

      const { set } = await import("@/lib/redis");
      await set("key1", "value1", 300);

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body).toEqual(["SET", "key1", "value1", "EX", "300"]);
    });
  });

  describe("get", () => {
    it("sends GET command", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: "myvalue" })
      );

      const { get } = await import("@/lib/redis");
      const result = await get("key1");

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body).toEqual(["GET", "key1"]);
      expect(result).toBe("myvalue");
    });

    it("returns null on missing key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: null })
      );

      const { get } = await import("@/lib/redis");
      const result = await get("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("del", () => {
    it("sends DEL command", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: 1 })
      );

      const { del } = await import("@/lib/redis");
      const result = await del("key1");

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body).toEqual(["DEL", "key1"]);
      expect(result).toBe(1);
    });
  });

  describe("checkDedup", () => {
    it("returns false when key does not exist", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: null })
      );

      const { checkDedup } = await import("@/lib/redis");
      const result = await checkDedup("user1", "github");
      expect(result).toBe(false);
    });

    it("returns true when key exists", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: "1" })
      );

      const { checkDedup } = await import("@/lib/redis");
      const result = await checkDedup("user1", "github");
      expect(result).toBe(true);
    });

    it("uses correct key format notif:{userId}:{channel}", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: null })
      );

      const { checkDedup } = await import("@/lib/redis");
      await checkDedup("user-123", "leetcode");

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body).toEqual(["GET", "notif:user-123:leetcode"]);
    });
  });

  describe("markSent", () => {
    it("sets key with 90-minute (5400s) TTL", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: "OK" })
      );

      const { markSent } = await import("@/lib/redis");
      await markSent("user-123", "github");

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(body).toEqual([
        "SET",
        "notif:user-123:github",
        "1",
        "EX",
        "5400",
      ]);
    });
  });

  describe("cached", () => {
    it("returns cached value skipping factory", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockFetchResponse({ result: JSON.stringify({ data: "cached" }) })
      );

      const factory = vi.fn();
      const { cached } = await import("@/lib/redis");
      const result = await cached("cache-key", 60, factory);

      expect(result).toEqual({ data: "cached" });
      expect(factory).not.toHaveBeenCalled();
    });

    it("calls factory and caches on miss", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          createMockFetchResponse({ result: null }) // GET returns null
        )
        .mockResolvedValueOnce(
          createMockFetchResponse({ result: "OK" }) // SET succeeds
        );

      const factory = vi.fn().mockResolvedValue({ data: "fresh" });
      const { cached } = await import("@/lib/redis");
      const result = await cached("cache-key", 120, factory);

      expect(result).toEqual({ data: "fresh" });
      expect(factory).toHaveBeenCalled();

      // Verify SET was called with the cached value
      const setBody = JSON.parse(
        (mockFetch.mock.calls[1][1] as RequestInit).body as string
      );
      expect(setBody[0]).toBe("SET");
      expect(setBody[1]).toBe("cache-key");
      expect(JSON.parse(setBody[2])).toEqual({ data: "fresh" });
      expect(setBody[3]).toBe("EX");
      expect(setBody[4]).toBe("120");
    });
  });

  describe("missing env vars", () => {
    it("throws if UPSTASH_REDIS_REST_URL is missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      vi.resetModules();
      const { get } = await import("@/lib/redis");

      await expect(get("key")).rejects.toThrow(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN"
      );
    });

    it("throws if UPSTASH_REDIS_REST_TOKEN is missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      vi.resetModules();
      const { get } = await import("@/lib/redis");

      await expect(get("key")).rejects.toThrow(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN"
      );
    });
  });
});
