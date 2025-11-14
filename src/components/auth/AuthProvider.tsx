import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, Profile } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensureProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: userId, role: "user" })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile as Profile);
      } else {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error("Error ensuring profile:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await ensureProfile(user.id);
    }
  }, [user, ensureProfile]);

  useEffect(() => {
    let isMounted = true;

    const processSession = (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        ensureProfile(nextSession.user.id).finally(() => {
          if (isMounted) {
            setInitializing(false);
          }
        });
      } else {
        setProfile(null);
        setInitializing(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        processSession(session);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [ensureProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        initializing,
        profileLoading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
