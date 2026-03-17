import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupTestEnv } from "@/__tests__/helpers/mocks";

const mockCreateClient = vi.fn(() => ({ _mock: true }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe("Supabase client", () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    cleanup = setupTestEnv();
  });

  afterEach(() => {
    cleanup();
  });

  async function importDb() {
    // Re-mock after resetModules
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: (...args: unknown[]) => mockCreateClient(...args),
    }));
    return import("@/lib/db");
  }

  it("getSupabaseAdmin creates client with service role key and persistSession false", async () => {
    const db = await importDb();
    db.getSupabaseAdmin();

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      { auth: { persistSession: false } }
    );
  });

  it("getSupabaseAdmin returns same singleton on second call", async () => {
    const db = await importDb();
    const first = db.getSupabaseAdmin();
    const second = db.getSupabaseAdmin();

    expect(first).toBe(second);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it("throws if NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const db = await importDb();

    expect(() => db.getSupabaseAdmin()).toThrow(
      "Missing env variable NEXT_PUBLIC_SUPABASE_URL"
    );
  });

  it("throws if SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = await importDb();

    expect(() => db.getSupabaseAdmin()).toThrow(
      "Missing env variable SUPABASE_SERVICE_ROLE_KEY"
    );
  });

  it("getSupabaseBrowser creates client with anon key and persistSession true", async () => {
    const db = await importDb();
    db.getSupabaseBrowser();

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      { auth: { persistSession: true } }
    );
  });

  it("supabaseAdmin proxy delegates property access to real client", async () => {
    const mockClient = { from: vi.fn(() => "mocked") };
    mockCreateClient.mockReturnValue(mockClient);

    const db = await importDb();
    const result = (db.supabaseAdmin as any).from("users");

    expect(mockClient.from).toHaveBeenCalledWith("users");
    expect(result).toBe("mocked");
  });

  it("supabaseBrowser proxy delegates property access to real client", async () => {
    const mockClient = { from: vi.fn(() => "browser-mocked") };
    mockCreateClient.mockReturnValue(mockClient);

    const db = await importDb();
    const result = (db.supabaseBrowser as any).from("users");

    expect(mockClient.from).toHaveBeenCalledWith("users");
    expect(result).toBe("browser-mocked");
  });
});
