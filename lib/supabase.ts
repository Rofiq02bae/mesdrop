import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error("Missing required Supabase environment variables.");
}

// Public client — respects RLS, used for auth-protected routes
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — bypasses RLS, used for public feedback writes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
