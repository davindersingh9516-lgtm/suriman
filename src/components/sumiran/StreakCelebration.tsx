import { useEffect } from "react";

interface Props {
  open: boolean;
  days: number;
  onClose: () => void;
}

const COPY: Record<number, { title: string; sub: string }> = {
  3: { title: "Beautiful start", sub: "3 days of consistent sadhana 🙏" },
  7: { title: "Amazing consistency", sub: "A full week of devotion 🙏" },
  21: { title: "A new habit, formed", sub: "21 days — your sadhana is rooted 🙏" },
  108: { title: "108 days of grace", sub: "A sacred milestone reached 🙏" },
};

/**
 * Calm milestone celebration: soft gold glow + fade/scale.
 * No confetti, no sound (the bell already plays on mala completion).
 * Auto-dismisses after ~3.6s; tappable to dismiss earlier.
 */
export function StreakCelebration({ open, days, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 3600);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;
  const c = COPY[days] ?? { title: "Wonderful streak", sub: `${days} days of sadhana 🙏` };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={`${days} day streak milestone`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center px-6 cursor-pointer animate-fade-in"
      style={{
        background:
          "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--color-gold) 22%, transparent) 0%, color-mix(in oklab, var(--color-maroon) 12%, transparent) 60%, transparent 100%)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="text-center max-w-sm w-full rounded-3xl border border-gold/40 bg-card/95 px-6 py-7 shadow-elevated animate-scale-in"
        style={{
          boxShadow:
            "0 0 0 6px color-mix(in oklab, var(--color-gold) 16%, transparent), 0 18px 50px -16px color-mix(in oklab, var(--color-maroon) 35%, transparent)",
        }}
      >
        <div className="font-mantra text-6xl text-saffron drop-shadow-sm leading-none">ॐ</div>
        <div className="mt-4 font-counter text-5xl text-maroon tabular-nums leading-none">
          {days}
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          day streak
        </div>
        <div className="mt-4 text-base font-semibold text-foreground">{c.title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{c.sub}</div>
        <div className="mt-5 text-[11px] text-muted-foreground/80">tap to dismiss</div>
      </div>
    </div>
  );
}
