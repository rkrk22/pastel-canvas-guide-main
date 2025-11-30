import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase, Profile } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

const getInitials = (username?: string | null) => {
  if (!username) return "U";
  const clean = username.trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return clean.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const AccountPage = () => {
  const { user, profile, initializing, profileLoading, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  const initials = useMemo(() => getInitials(username || profile?.username), [username, profile?.username]);
  const level = profile?.level ?? 0;

  const hasChanges =
    username !== (profile?.username ?? "") ||
    avatarUrl !== (profile?.avatar_url ?? "");

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Partial<Profile> = {
        username: username.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated");
      await refreshProfile();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setUsername(profile?.username ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <UserCircle2 className="h-6 w-6" />
            <p className="text-sm font-medium">My account</p>
          </div>
          <h1 className="text-3xl font-semibold">Profile</h1>
          <p className="text-muted-foreground">
            Update your nickname and avatar. Changes are saved to your Supabase profile.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile details</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 pt-6">
            {profileLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading profile…</span>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-muted">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={username || "Avatar"} /> : null}
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                <p>Preview</p>
                <p className="font-medium text-foreground">{username || "No nickname set"}</p>
                <p>Level: {level}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Nickname</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Your nickname"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="Link to your avatar image"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Your email: <span className="font-medium text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleReset} disabled={!hasChanges || saving}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AccountPage;
