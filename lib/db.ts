import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env variable NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env variable NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
if (!supabaseServiceRoleKey) {
  throw new Error("Missing env variable SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
});
