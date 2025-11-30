import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReaderProfileModal } from "@/components/app/ReaderProfileModal";
import { ReaderProfile, useProfiles } from "@/hooks/useProfiles";

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

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getPosition = (profile: ReaderProfile, index: number) => {
  const seed = hashString(profile.id || String(index));
  const angle = ((seed % 360) * Math.PI) / 180;
  const baseRadius = 90;
  const layerRadius = 55 * Math.floor(index / 6);
  const jitter = seed % 45;
  const radius = baseRadius + layerRadius + jitter;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.65; // compress vertically a bit
  return { x, y };
};

const ReadersPage = () => {
  const { user, initializing } = useAuth();
  const { data: profiles, isLoading, isError, error, refetch, isFetching } = useProfiles({
    enabled: !!user,
  });
  const [selectedProfile, setSelectedProfile] = useState<ReaderProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectProfile = (profile: ReaderProfile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
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

  const renderErrorMessage = () => {
    if (!error) return null;
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
      return String((error as { message?: unknown }).message);
    }
    return "Please try again.";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Readers
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse fellow readers and view their profile cards.
          </p>
        </div>
        {isFetching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Refreshing…</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-destructive">Failed to load readers.</p>
          {renderErrorMessage() && (
            <p className="text-xs text-muted-foreground max-w-md">{renderErrorMessage()}</p>
          )}
          <Button onClick={() => refetch()} disabled={isFetching}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="relative min-h-[60vh]">
          {profiles && profiles.length > 0 ? (
            profiles.map((profile) => {
              const initials = getInitials(profile.username);
              const { x, y } = getPosition(profile, profiles.indexOf(profile));
              return (
                <button
                  key={profile.id}
                  className="group absolute flex items-center justify-center transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(45% + ${y}px)`,
                  }}
                  onClick={() => handleSelectProfile(profile)}
                  type="button"
                  aria-label={profile.username || "Reader"}
                >
                  <Avatar className="h-24 w-24 border-2 border-muted shadow-md bg-card">
                    {profile.avatar_url ? (
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.username ?? "Reader avatar"}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <p className="text-sm">No readers yet.</p>
              <p className="text-xs">Readers will appear here once profiles are created.</p>
            </div>
          )}
        </div>
      )}

      <ReaderProfileModal
        open={isModalOpen && !!selectedProfile}
        onClose={handleCloseModal}
        profile={selectedProfile}
      />
    </div>
  );
};

export default ReadersPage;
