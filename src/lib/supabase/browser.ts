import { createBrowserClient } from "@supabase/ssr";

const defaultUrl = "https://etlauinhmtcsgcxabmyu.supabase.co";
const defaultKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bGF1aW5obXRjc2djeGFibXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NjQ2NTQsImV4cCI6MjEwMjU0MDY1NH0.r3kWGJpTYGrgHcQFFtil1MgODyCgXhQakUMF9glqhPY";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey;
  return createBrowserClient(url, key);
}
