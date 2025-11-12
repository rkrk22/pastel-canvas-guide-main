import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://ryxpmdiimatadxaybbvf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5eHBtZGlpbWF0YWR4YXliYnZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MzIzMzAsImV4cCI6MjA3ODUwODMzMH0.oKnr6Gkc3Fo9UQ7cMa31BeJWyFBc2UVvDkgAIc8jbgM";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
