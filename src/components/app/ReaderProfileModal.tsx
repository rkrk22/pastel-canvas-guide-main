import { ReaderProfile } from "@/hooks/useProfiles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMemo } from "react";

interface ReaderProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: ReaderProfile | null;
}

const getInitials = (username?: string | null) => {
  if (!username) return "R";
  const clean = username.trim();
  if (!clean) return "R";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return clean.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const ReaderProfileModal = ({ open, onClose, profile }: ReaderProfileModalProps) => {
  if (!profile) return null;

  const initials = useMemo(() => getInitials(profile?.username), [profile?.username]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="h-24 w-24 border-2 border-muted">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.username ?? "Reader avatar"} />
            ) : null}
            <AvatarFallback className="text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{profile?.username || "Unknown reader"}</p>
            <p className="text-sm text-muted-foreground">Level: {profile?.level ?? 0}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
