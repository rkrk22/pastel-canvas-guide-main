import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase, Profile } from "@/lib/supabase";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const AppShell = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAdminElevation, setShowAdminElevation] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);

      checkAdminElevation(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const checkAdminElevation = async (currentProfile: Profile) => {
    if (currentProfile.role === 'admin') return;

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    if (!admins || admins.length === 0) {
      const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((e: string) => e.trim()) || [];
      if (adminEmails.includes(user?.email || '')) {
        setShowAdminElevation(true);
      }
    }
  };

  const handleElevateToAdmin = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("You are now an admin!");
      setShowAdminElevation(false);
      fetchProfile(user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to elevate to admin");
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar isAdmin={profile?.role === 'admin'} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} isAdmin={profile?.role === 'admin'} />

        {showAdminElevation && (
          <div className="bg-accent/20 border-b border-accent p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>You're eligible to become an admin (first user or in ADMIN_EMAILS)</span>
            </div>
            <Button size="sm" onClick={handleElevateToAdmin}>
              Set as Admin
            </Button>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
