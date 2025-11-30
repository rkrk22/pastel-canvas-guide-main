import type { Tables } from "@/integrations/supabase/types";

export { supabase } from "@/integrations/supabase/client";

export type DbProfile = Tables<"profiles">;
export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  level: number;
  role?: string | null;
};
export type Chapter = Tables<"chapters">;
export type Page = Tables<"pages">;

export const mapDbProfile = (profile: DbProfile): Profile => ({
  id: profile.id,
  username: profile.username ?? null,
  avatar_url: profile.avatar_url ?? null,
  level: profile.level ?? 0,
  role: (profile as { role?: string | null })?.role ?? null,
});
