import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Star } from "lucide-react";
import { useXp } from "./XpProvider";
import { toast } from "sonner";

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
  const storageKey = useMemo(() => {
    const slug = pageSlug || "global";
    const unique = id || labelText || `xp-${parsedAmount}`;
    return `xp-claim:${slug}:${unique}`;
  }, [id, labelText, pageSlug, parsedAmount]);

  useEffect(() => {
    if (!onceOnly || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    setClaimed(stored === "1");
  }, [onceOnly, storageKey]);

  const handleClick = async () => {
    if (pending) return;
    if (!parsedAmount || Number.isNaN(parsedAmount)) {
      toast.error("Invalid XP amount");
      return;
    }

    setPending(true);
    const success = await awardXp(parsedAmount, { sourceElement: buttonRef.current, label: labelText });

    if (success && onceOnly && typeof window !== "undefined") {
      // Temporarily disable collected state; do not persist.
    }
    setPending(false);
  };

  const disabled = pending;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-transform duration-150 hover:scale-[1.02] hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className ?? ""}`}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      <Star className={`h-4 w-4 ${disabled ? "" : "animate-pulse"}`} />
      <span>{labelText}</span>
    </button>
  );
};
