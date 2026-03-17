import { describe, it, expect, vi, beforeEach } from "vitest";

const { holder } = vi.hoisted(() => {
  const holder = { callback: null as ((req: any) => any) | null };
  return { holder };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn((cb: any) => {
    holder.callback = cb;
    return cb;
  }),
}));

// Import triggers auth(callback), populating holder.callback
import middlewareDefault, { config } from "@/middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createReq(pathname: string, authenticated: boolean) {
    const url = `http://localhost:3000${pathname}`;
    return {
      nextUrl: new URL(url),
      url,
      auth: authenticated ? { user: { name: "test" } } : null,
    };
  }

  function runMiddleware(pathname: string, authenticated: boolean) {
    const req = createReq(pathname, authenticated);
    return holder.callback!(req);
  }

  it("captures the auth callback", () => {
    expect(holder.callback).toBeTypeOf("function");
  });

  it("allows unauthenticated access to /", () => {
    const result = runMiddleware("/", false);
    expect(result).toBeUndefined();
  });

  it("allows unauthenticated access to /login", () => {
    const result = runMiddleware("/login", false);
    expect(result).toBeUndefined();
  });

  it("allows unauthenticated access to /api/auth routes", () => {
    const result = runMiddleware("/api/auth/callback/github", false);
    expect(result).toBeUndefined();
  });

  it("allows unauthenticated access to /api/notify routes", () => {
    const result = runMiddleware("/api/notify/trigger", false);
    expect(result).toBeUndefined();
  });

  it("redirects unauthenticated user from /dashboard to /login", () => {
    const result = runMiddleware("/dashboard", false);
    expect(result).toBeInstanceOf(Response);
    const location = new URL(result.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("callbackUrl")).toBe("/dashboard");
  });

  it("redirects unauthenticated user from /settings to /login", () => {
    const result = runMiddleware("/settings", false);
    expect(result).toBeInstanceOf(Response);
    const location = new URL(result.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("callbackUrl")).toBe("/settings");
  });

  it("allows authenticated user to access /dashboard", () => {
    const result = runMiddleware("/dashboard", true);
    expect(result).toBeUndefined();
  });

  describe("config.matcher", () => {
    it("has a pattern that excludes static assets", () => {
      const matcher = config.matcher[0];
      expect(matcher).toContain("_next/static");
      expect(matcher).toContain("_next/image");
      expect(matcher).toContain("favicon");
      expect(matcher).toContain("svg|png|jpg|jpeg|gif|webp");
    });
  });
});
