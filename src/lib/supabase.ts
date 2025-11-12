import type { Tables } from "@/integrations/supabase/types";

export { supabase } from "@/integrations/supabase/client";

export type Profile = Tables<"profiles">;
export type Chapter = Tables<"chapters">;
export type Page = Tables<"pages">;
