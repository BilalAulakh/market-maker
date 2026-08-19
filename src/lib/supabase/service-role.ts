import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Privileged Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Guarded by 'server-only' import so client component imports fail at build time.
 * MUST only be used for server-side financial writes and administrative tasks.
 */
export function createServiceRoleClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getServiceRoleClient = createServiceRoleClient;

