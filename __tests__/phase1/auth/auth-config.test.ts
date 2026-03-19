import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
const mockUpsert = vi.fn();
const mockFrom = vi.fn((..._args: any[]) => ({
  upsert: mockUpsert,
}));

vi.mock("@/lib/db", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock("next-auth", () => ({
  default: vi.fn((config: any) => {
    // Return the callbacks directly so we can test them
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      _callbacks: config.callbacks,
    };
  }),
}));

vi.mock("next-auth/providers/github", () => ({
  default: vi.fn((config: any) => ({ id: "github", ...config })),
}));

describe("auth callbacks", () => {
  let callbacks: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });

    // Re-import to get the callbacks
    vi.resetModules();

    // Re-setup mocks after resetModules
    vi.doMock("@/lib/db", () => ({
      supabaseAdmin: {
        from: (...args: any[]) => mockFrom(...args),
      },
    }));

    vi.doMock("next-auth", () => ({
      default: vi.fn((config: any) => ({
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        _callbacks: config.callbacks,
      })),
    }));

    vi.doMock("next-auth/providers/github", () => ({
      default: vi.fn(() => ({ id: "github" })),
    }));

    const authModule = await import("@/lib/auth");
    // Access _callbacks from the mock
    const NextAuth = (await import("next-auth")).default;
    const lastCall = vi.mocked(NextAuth).mock.results[0]?.value;
    callbacks = lastCall._callbacks;
  });

  describe("signIn callback", () => {
    it("upserts user to Supabase with github_id, email, github_token", async () => {
      const result = await callbacks.signIn({
        user: { email: "test@example.com" },
        account: { access_token: "ghp_token123" },
        profile: { id: 12345 },
      });

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          github_id: "12345",
          email: "test@example.com",
          github_token: "ghp_token123",
        },
        { onConflict: "github_id" }
      );
      expect(result).toBe(true);
    });

    it("returns false when profile.id is missing", async () => {
      const result = await callbacks.signIn({
        user: { email: "test@example.com" },
        account: { access_token: "token" },
        profile: {},
      });

      expect(result).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("returns false when account is null", async () => {
      const result = await callbacks.signIn({
        user: { email: "test@example.com" },
        account: null,
        profile: { id: 12345 },
      });

      expect(result).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("returns false when upsert fails", async () => {
      mockUpsert.mockResolvedValue({ error: { message: "DB error" } });

      const result = await callbacks.signIn({
        user: { email: "test@example.com" },
        account: { access_token: "token" },
        profile: { id: 12345 },
      });

      expect(result).toBe(false);
    });

    it("returns true on successful upsert", async () => {
      mockUpsert.mockResolvedValue({ error: null });

      const result = await callbacks.signIn({
        user: { email: "test@example.com" },
        account: { access_token: "ghp_abc" },
        profile: { id: 99 },
      });

      expect(result).toBe(true);
    });
  });

  describe("jwt callback", () => {
    it("stores accessToken and githubId on token", () => {
      const token = { sub: "user1" };
      const result = callbacks.jwt({
        token,
        account: { access_token: "ghp_token" },
        profile: { id: 12345 },
      });

      expect(result.accessToken).toBe("ghp_token");
      expect(result.githubId).toBe("12345");
    });

    it("preserves existing fields when no account/profile", () => {
      const token = {
        sub: "user1",
        accessToken: "existing_token",
        githubId: "999",
      };
      const result = callbacks.jwt({ token });

      expect(result.accessToken).toBe("existing_token");
      expect(result.githubId).toBe("999");
      expect(result.sub).toBe("user1");
    });
  });

  describe("session callback", () => {
    it("attaches accessToken and githubId to session", () => {
      const session = { user: { name: "test" } } as any;
      const token = { accessToken: "ghp_token", githubId: "12345" };

      const result = callbacks.session({ session, token });

      expect(result.accessToken).toBe("ghp_token");
      expect(result.githubId).toBe("12345");
    });
  });
});
