import { useQuery } from "@tanstack/react-query";
import { supabase, Profile } from "@/lib/supabase";

export type ReaderProfile = Pick<Profile, "id" | "username" | "avatar_url" | "level">;

const mapProfiles = (profiles: Array<Partial<ReaderProfile> & { id: string }>): ReaderProfile[] =>
  profiles.map((profile) => ({
    id: profile.id,
    username: profile.username ?? null,
    avatar_url: profile.avatar_url ?? null,
    level: profile.level ?? 0,
  }));

const fetchProfiles = async (): Promise<ReaderProfile[]> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, level")
      .order("username", { ascending: true });

    if (error) throw error;
    return mapProfiles(data ?? []);
  } catch (error: unknown) {
    // Graceful fallback if new columns are not yet present in the database.
    const code = (error as { code?: string })?.code;
    if (code === "42703") {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id")
        .order("id", { ascending: true });

      if (fallbackError) throw fallbackError;
      return mapProfiles(fallbackData ?? []);
    }
    throw error;
  }
};

export const useProfiles = ({ enabled = true }: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
    enabled,
  });
};
