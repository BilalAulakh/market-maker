import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getClientEnv, getServerEnv } from "@/lib/env";

describe("Environment Variables Validation (env.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should successfully parse valid client environment variables", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid-anon-key";

    const env = getClientEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("valid-anon-key");
  });

  it("should throw error if client URL is missing or invalid", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid-anon-key";

    expect(() => getClientEnv()).toThrow("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
  });

  it("should successfully parse valid server environment variables", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "valid-service-role-key";

    const env = getServerEnv();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("valid-service-role-key");
  });

  it("should throw error if server key is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "valid-anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getServerEnv()).toThrow("SUPABASE_SERVICE_ROLE_KEY is required");
  });
});
