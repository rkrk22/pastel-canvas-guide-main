import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Star } from "lucide-react";
import { useXp } from "./XpProvider";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

type Boolish = boolean | string | undefined;

const parseBool = (value: Boolish) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "";
  }
  return false;
};

interface XpStarProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  amount?: string | number;
  label?: string;
  once?: Boolish;
  id?: string;
  pageSlug?: string;
}

export const XpStar = ({ amount, label, once, id, pageSlug, className, ...rest }: XpStarProps) => {
  const { awardXp } = useXp();
  const { user } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const [pending, setPending] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const parsedAmount = useMemo(() => {
    const value = typeof amount === "string" ? Number.parseInt(amount, 10) : amount;
    return Number.isFinite(value as number) ? Number(value) : 0;
  }, [amount]);

  const onceOnly = parseBool(once);
  const normalizedLabel = label?.trim();
  const labelText =
    normalizedLabel && normalizedLabel.toLowerCase() === "получить xp"
      ? "Claim XP"
      : normalizedLabel || `+${parsedAmount || 0} XP`;
  const token = useMemo(() => {
    const slug = pageSlug || "global";
    const unique = id || labelText || `xp-${parsedAmount}`;
    return `${slug}:${unique}`;
  }, [id, labelText, pageSlug, parsedAmount]);

  useEffect(() => {
    let cancelled = false;
    if (!onceOnly || !user) return;

    const fetchClaim = async () => {
      const { data, error } = await supabase
        .from("xp_claims")
        .select("token")
        .eq("user_id", user.id)
        .eq("token", token)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Failed to check claim", error);
        return;
      }
      if (data) {
        setClaimed(true);
      }
    };

    fetchClaim();
    return () => {
      cancelled = true;
    };
  }, [onceOnly, token, user]);

  const handleClick = async () => {
    if (pending) return;
    if (!parsedAmount || Number.isNaN(parsedAmount)) {
      toast.error("Invalid XP amount");
      return;
    }
    if (!user) {
      toast.error("Please sign in to earn XP");
      return;
    }
    if (onceOnly && claimed) {
      toast.info("XP already collected");
      return;
    }

    setPending(true);
    let insertedClaim = false;
    try {
      if (onceOnly) {
        const { error: claimError } = await supabase
          .from("xp_claims")
          .insert({ user_id: user.id, token });
        if (claimError) {
          const code = (claimError as { code?: string })?.code;
          if (code === "23505") {
            setClaimed(true);
            toast.info("XP already collected");
            setPending(false);
            return;
          }
          throw claimError;
        }
        insertedClaim = true;
      }

      const success = await awardXp(parsedAmount, { sourceElement: buttonRef.current, label: labelText });

      if (!success && insertedClaim) {
        await supabase
          .from("xp_claims")
          .delete()
          .eq("user_id", user.id)
          .eq("token", token);
      }

      if (success && onceOnly) {
        setClaimed(true);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not claim XP";
      console.error("XP claim failed", error);
      toast.error(message);
    }
    setPending(false);
  };

  const disabled = pending || (onceOnly && claimed);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-transform duration-150 hover:scale-[1.02] hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${disabled ? "opacity-60 cursor-default" : ""} ${className ?? ""}`}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      <Star className={`h-4 w-4 ${disabled ? "" : "animate-pulse"}`} />
      <span>{onceOnly && claimed ? "Collected" : labelText}</span>
    </button>
  );
};
