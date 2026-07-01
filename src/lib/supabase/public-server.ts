import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | null = null;

export function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) return null;
  return { url, key };
}

/** Server-side Supabase client with anon key (public RLS policies only). */
export function createPublicServerClient(): SupabaseClient {
  const config = getPublicSupabaseConfig();
  if (!config) {
    throw new Error("Supabase public credentials are not configured");
  }

  if (!publicClient) {
    publicClient = createClient(config.url, config.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return publicClient;
}
