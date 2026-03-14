import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env variable ${name}`);
  }
  return value;
}

let _supabaseAdmin: SupabaseClient<Database> | null = null;
let _supabaseBrowser: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient<Database>(
      getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
      getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
  }
  return _supabaseAdmin;
}

export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (!_supabaseBrowser) {
    _supabaseBrowser = createClient<Database>(
      getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
      getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { persistSession: true } }
    );
  }
  return _supabaseBrowser;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return Reflect.get(getSupabaseAdmin(), prop);
  },
});

export const supabaseBrowser = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return Reflect.get(getSupabaseBrowser(), prop);
  },
});
