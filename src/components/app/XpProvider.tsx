import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

type Point = { x: number; y: number };

type Flight = {
  id: string;
  text: string;
  start: Point;
  end: Point;
};

type AwardOptions = {
  sourceElement?: HTMLElement | null;
  label?: string;
};

const FLIGHT_DURATION = 1400;
const FLIGHT_CLEANUP = 1450;
const PULSE_DURATION = 200;

interface XpContextValue {
  exp: number;
  awardXp: (amount: number, options?: AwardOptions) => Promise<boolean>;
  setCounterRef: (element: HTMLElement | null) => void;
  pulse: boolean;
}

const XpContext = createContext<XpContextValue | undefined>(undefined);

const calcCenter = (rect: DOMRect): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `xp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const XpProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [exp, setExp] = useState(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [counterRef, setCounterRef] = useState<HTMLElement | null>(null);
  const [pulse, setPulse] = useState(false);
  const pendingRef = useRef(false);
  const latestExp = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        latestExp.current = 0;
        setExp(0);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("user_progress")
          .select("exp")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Failed to load XP progress", error);
          return;
        }

        if (data && typeof data.exp === "number") {
          latestExp.current = data.exp;
          setExp(data.exp);
          return;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("user_progress")
          .insert({ user_id: user.id, exp: 0 })
          .select("exp")
          .single();

        if (insertError) {
          console.error("Failed to init XP progress", insertError);
          return;
        }

        latestExp.current = inserted?.exp ?? 0;
        setExp(inserted?.exp ?? 0);
      } catch (error) {
        console.error("Unexpected XP load error", error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const removeFlight = useCallback((id: string) => {
    setFlights((current) => current.filter((flight) => flight.id !== id));
  }, []);

  const awardXp = useCallback(
    async (amount: number, options?: AwardOptions) => {
      if (pendingRef.current) return false;
      if (!amount || Number.isNaN(amount) || amount <= 0) return false;

      if (!user) {
        toast.error("Please sign in to earn XP");
        return false;
      }

      const baseExp = latestExp.current ?? exp ?? 0;
      const nextExp = baseExp + amount;
      const label = options?.label ?? `+${amount} XP`;

      const startRect = options?.sourceElement?.getBoundingClientRect();
      const endRect = counterRef?.getBoundingClientRect();

      if (startRect && endRect) {
        const id = makeId();
        setFlights((current) => [
          ...current,
          {
            id,
            text: label,
            start: calcCenter(startRect),
            end: calcCenter(endRect),
          },
        ]);
        window.setTimeout(() => removeFlight(id), FLIGHT_CLEANUP);
      }

      pendingRef.current = true;

      try {
        const { error } = await supabase
          .from("user_progress")
          .upsert({ user_id: user.id, exp: nextExp }, { onConflict: "user_id" });

        if (error) {
          throw error;
        }

        window.setTimeout(() => {
          latestExp.current = nextExp;
          setExp(nextExp);
        }, FLIGHT_DURATION);
        window.setTimeout(() => {
          setPulse(true);
          window.setTimeout(() => setPulse(false), PULSE_DURATION);
        }, FLIGHT_DURATION);
        toast.success(`+${amount} XP`);
        return true;
      } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        const message = error instanceof Error ? error.message : "Could not add XP";
        console.error("XP update failed", error);
        toast.error(code ? `${message} (${code})` : message);
        setExp(baseExp);
        return false;
      } finally {
        pendingRef.current = false;
      }
    },
    [counterRef, exp, removeFlight, user],
  );

  const value = useMemo(
    () => ({
      exp,
      awardXp,
      setCounterRef,
      pulse,
    }),
    [awardXp, exp, pulse],
  );

  return (
    <XpContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[60] overflow-visible">
              {flights.map((flight) => (
                <span
                  key={flight.id}
                  className="absolute text-sm font-semibold text-primary drop-shadow-md animate-[xp-flight_1400ms_linear_forwards]"
                  style={
                    {
                      "--xp-start-x": `${flight.start.x}px`,
                      "--xp-start-y": `${flight.start.y}px`,
                      "--xp-end-x": `${flight.end.x}px`,
                      "--xp-end-y": `${flight.end.y}px`,
                    } as CSSProperties
                  }
                >
                  {flight.text}
                </span>
              ))}
            </div>,
            document.body,
          )
        : null}
    </XpContext.Provider>
  );
};

export const useXp = () => {
  const context = useContext(XpContext);
  if (!context) {
    throw new Error("useXp must be used within an XpProvider");
  }
  return context;
};
