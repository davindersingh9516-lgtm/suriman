import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  days: number;
  className?: string;
}

/**
 * Calm saffron/gold streak badge for the home screen.
 * Hidden when days = 0 (don't shame new users).
 */
export function StreakBadge({ days, className }: Props) {
  if (days <= 0) return null;
  const label = `${days} Day${days === 1 ? "" : "s"} Streak`;
  return (
    <div
      role="status"
      aria-label={`Current streak: ${days} day${days === 1 ? "" : "s"}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "bg-gold-soft/70 border border-gold/45 text-maroon",
        "shadow-soft animate-fade-in",
        className,
      )}
      style={{
        boxShadow:
          "0 1px 0 color-mix(in oklab, var(--color-gold) 30%, transparent) inset, 0 4px 12px -6px color-mix(in oklab, var(--color-gold) 45%, transparent)",
      }}
    >
      <Flame className="h-3.5 w-3.5 text-saffron" aria-hidden />
      <span className="text-[12px] font-semibold tracking-tight tabular-nums">
        {label}
      </span>
    </div>
  );
}
