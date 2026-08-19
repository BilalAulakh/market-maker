import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ required_error: "NEXT_PUBLIC_SUPABASE_URL is required" })
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ required_error: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ required_error: "SUPABASE_SERVICE_ROLE_KEY is required" })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getClientEnv(): ClientEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://etlauinhmtcsgcxabmyu.supabase.co";

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGF1aW5obXRjc2djeGFibXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjQ2NTQsImV4cCI6MjEwMjU0MDY1NH0.r3kWGJpTYGrgHcQFFtil1MgODyCgXhQakUMF9glqhPY";

  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
  });

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid Client Environment Variables: ${errorMessages}`);
  }

  return parsed.data;
}

export function getServerEnv(): ServerEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : "https://etlauinhmtcsgcxabmyu.supabase.co";

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGF1aW5obXRjc2djeGFibXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjQ2NTQsImV4cCI6MjEwMjU0MDY1NH0.r3kWGJpTYGrgHcQFFtil1MgODyCgXhQakUMF9glqhPY";

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  });

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid Server Environment Variables: ${errorMessages}`);
  }

  return parsed.data;
}
