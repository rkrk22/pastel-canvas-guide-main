import { ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

interface ContentGateProps {
  isFree: boolean;
  children: ReactNode;
}

/**
 * Gates paid content based on the page flag and the current user's profile.
 */
export const ContentGate = ({ isFree, children }: ContentGateProps) => {
  const { profile, profileLoading, user, initializing, refreshProfile } = useAuth();
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const emailIsAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase());
  const isAdmin = emailIsAdmin || profile?.role === "admin";
  const hasPaidAccess = isAdmin || !!profile?.paid;
  const loading = initializing || profileLoading;

  useEffect(() => {
    if (user && !profile && !profileLoading) {
      void refreshProfile();
    }
  }, [user, profile, profileLoading, refreshProfile]);

  if (isFree || hasPaidAccess) {
    return <>{children}</>;
  }

  // Admins should always bypass gating, even if paid flag is false.
  if (isAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Checking your access…</span>
      </div>
    );
  }

  const ctaHref = user ? "/app/account" : "/auth";

  return (
    <div className="border border-dashed border-border rounded-xl p-6 bg-muted/20 text-center space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>This chapter is part of the paid Game Art Guidebook.</span>
      </div>
      <p className="text-base font-medium text-foreground">
        Get access to read the full content.
      </p>
      <Button asChild>
        <Link to={ctaHref}>Get access to the Guidebook</Link>
      </Button>
    </div>
  );
};
