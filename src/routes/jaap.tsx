import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Bell } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { BeadRing } from "@/components/sumiran/BeadRing";
import { StreakBadge } from "@/components/sumiran/StreakBadge";
import { StreakCelebration } from "@/components/sumiran/StreakCelebration";
import { DEFAULT_MALA } from "@/utils/constants";
import {
  counterStore,
  useCounter,
  selectMalasToday,
  evaluateBadges,
  selectStreakLite,
  STREAK_MILESTONES,
} from "@/store/counter";
import { vibrate, bell } from "@/services/feedback";
import { loadMeta } from "@/storage/db";
import logo from "@/assets/sumiran-logo.png";

export const Route = createFileRoute("/jaap")({
  head: () => ({
    meta: [
      { title: "Counter — Sumiran" },
      { name: "description", content: "Tap to count your mantra japa with calm focus." },
    ],
  }),
  component: CounterScreen,
});

function CounterScreen() {
  const navigate = useNavigate();
  const ready = useCounter((s) => s.ready);
  const beads = useCounter((s) => s.beads);
  const malasToday = useCounter((s) => selectMalasToday(s));
  const dailyGoal = useCounter((s) => s.dailyGoal);
  const mantra = useCounter((s) => s.mantra);
  const justCompleted = useCounter((s) => s.justCompletedMala);
  const haptics = useCounter((s) => s.settings.haptics);
  const reminderEnabled = useCounter((s) => s.settings.reminderEnabled);
  const reminderTime = useCounter((s) => s.settings.reminderTime);
  const streak = useCounter(selectStreakLite);
  const firstMalaOfDayAt = useCounter((s) => s.firstMalaOfDayAt);
  const streakResetSeen = useCounter((s) => s.streakResetSeen);
  const streakMilestones = useCounter((s) => s.streakMilestones);
  const [milestoneDay, setMilestoneDay] = useState<number | null>(null);

  // First-launch onboarding gate
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const done = await loadMeta<boolean>("onboarded", false);
      if (!done && !cancelled) navigate({ to: "/onboarding" });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, navigate]);

  const [pulseKey, setPulseKey] = useState(0);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const filled = Math.round((beads / DEFAULT_MALA) * 36);
  const goalPct = Math.min(100, Math.round((malasToday / dailyGoal) * 100));

  const buzz = useCallback((p: number | number[]) => { if (haptics) vibrate(p); }, [haptics]);

  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (justCompleted) {
      bell(0.22);
      buzz([30, 60, 80]);
      setShowCelebration(true);
      const t = setTimeout(() => setShowCelebration(false), 2200);
      return () => clearTimeout(t);
    }
  }, [justCompleted, buzz]);

  // First mala of the day → small "streak continued" toast.
  // Also detects if this completion crosses a milestone (3/7/21/108).
  useEffect(() => {
    if (firstMalaOfDayAt === 0) return;
    toast("Streak continued 🔥", {
      description: `${streak.current} day${streak.current === 1 ? "" : "s"} of sadhana`,
      duration: 2400,
    });
    const hit = (STREAK_MILESTONES as readonly number[]).find(
      (m) => streak.current === m && !streakMilestones[m],
    );
    if (hit) {
      setMilestoneDay(hit);
      counterStore.markMilestoneCelebrated(hit);
    }
    counterStore.consumeFirstMalaFlag();
  }, [firstMalaOfDayAt, streak.current, streakMilestones]);

  // Gentle reminder when a streak was broken (shown once).
  useEffect(() => {
    if (!ready || streakResetSeen) return;
    toast("Let's start again today 🙏", {
      description: "Every day is a fresh sadhana.",
      duration: 3500,
    });
    counterStore.acknowledgeStreakReset();
  }, [ready, streakResetSeen]);

  const handleTap = useCallback(() => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    counterStore.tap();
    evaluateBadges();
    buzz(8);
    setPulseKey((k) => k + 1);
  }, [buzz]);

  // Long-press to reset (prevents accidents)
  const onPointerDown = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      counterStore.reset();
      buzz([20, 40, 20]);
    }, 700);
  };
  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <AppShell>
      {/* Top — centered brand logo */}
      <Container className="pt-4 pb-1 safe-top flex flex-col items-center">
        <Link to="/" aria-label="Sumiran home">
          <img
            src={logo}
            alt="Sumiran"
            style={{ width: "100px", height: "100px" }}
            className="object-contain drop-shadow-[0_2px_8px_rgba(255,107,0,0.25)]"
          />
        </Link>
        {streak.current > 0 && (
          <div className="mt-2">
            <StreakBadge days={streak.current} />
          </div>
        )}
      </Container>

      {/* Mantra + daily chip */}
      <Container className="pt-2 pb-2">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-mantra text-xl text-maroon truncate leading-tight">{mantra.hi}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {mantra.en} ·{" "}
              <Link to="/mantra" className="text-saffron font-medium">
                change
              </Link>
            </p>
          </div>
          <DailyChip value={malasToday} goal={dailyGoal} pct={goalPct} />
        </div>
      </Container>

      {/* Counter — large forgiving tap target, responsive size to avoid scroll */}
      <div className="relative px-5 mt-2 flex justify-center">
        <button
          onPointerDown={onPointerDown}
          onPointerUp={clearPress}
          onPointerLeave={clearPress}
          onPointerCancel={clearPress}
          onClick={handleTap}
          aria-label={`Tap to count. Current ${beads} of ${DEFAULT_MALA}`}
          className="relative block aspect-square w-full max-w-[min(86vw,320px)] sm:max-w-[340px] rounded-full focus:outline-none touch-manipulation select-none"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {/* Rotating mala beads */}
          <BeadRing size={320} beads={36} filled={filled} duration={90} />

          {/* Golden celebration ripple */}
          {justCompleted && (
            <span
              key={`ripple-${pulseKey}`}
              aria-hidden
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--color-gold) 55%, transparent) 0%, transparent 65%)",
                animation: "sumiran-ripple 1.4s ease-out forwards",
              }}
            />
          )}

          {/* Inner saffron-gradient disc — centering wrapper is stable; only the inner layer animates on tap */}
          <div className="absolute left-1/2 top-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2">
            <div
              key={`disc-${pulseKey}`}
              className="h-full w-full rounded-full flex flex-col items-center justify-center border border-border/50"
              style={{
                background:
                  "radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--color-saffron) 16%, var(--color-card)) 0%, var(--color-card) 70%)",
                boxShadow:
                  "0 18px 40px -18px color-mix(in oklab, var(--color-maroon) 35%, transparent), inset 0 1px 0 color-mix(in oklab, var(--color-cream) 80%, transparent)",
                animation: "sumiran-tap-scale 220ms ease-out",
                transformOrigin: "center",
              }}
            >
              <div
                className="font-counter text-[4.5rem] sm:text-[5.5rem] leading-none text-maroon tabular-nums"
                style={{ textShadow: "0 1px 0 color-mix(in oklab, var(--color-cream) 90%, transparent)" }}
              >
                {beads}
              </div>
              <div className="mt-2 text-[11px] tracking-[0.25em] text-muted-foreground">
                / {DEFAULT_MALA}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Mala count beneath */}
      <Container className="mt-5 text-center">
        <p className="text-sm text-foreground/80">
          <span className="font-counter text-saffron text-lg">{malasToday}</span>{" "}
          {malasToday === 1 ? "mala" : "malas"} completed today
        </p>
      </Container>

      {/* Action row */}
      <div className="mt-5 flex items-center justify-center gap-10">
        <ActionButton onClick={() => counterStore.reset()} label="Reset">
          <RotateCcw className="h-5 w-5" />
        </ActionButton>
        <ActionButton onClick={() => bell(0.22)} label="Bell" tone="saffron">
          <Bell className="h-5 w-5" />
        </ActionButton>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        रीसेट के लिए लंबा दबाएँ · long-press to reset
      </p>

      {reminderEnabled && (
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          ⏰ Daily reminder at {formatTime(reminderTime)}
        </p>
      )}

      {/* Calm completion overlay — appears for ~2.2s when a mala completes */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          aria-live="polite"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--color-gold) 18%, transparent) 0%, transparent 65%)",
            animation: "sumiran-fade 2.2s ease-out forwards",
          }}
        >
          <div className="text-center" style={{ animation: "sumiran-rise 2.2s ease-out forwards" }}>
            <div className="font-mantra text-7xl text-saffron drop-shadow-sm">ॐ</div>
            <div className="mt-3 text-base font-semibold text-maroon">
              1 mala complete
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              माला पूर्ण हुई 🙏
            </div>
          </div>
        </div>
      )}

      {/* Streak milestone celebration (3/7/21/108) */}
      <StreakCelebration
        open={milestoneDay !== null}
        days={milestoneDay ?? 0}
        onClose={() => setMilestoneDay(null)}
      />
    </AppShell>
  );
}

function formatTime(t: string): string {
  // "07:00" → "7:00 AM"
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m} ${ampm}`;
}

function DailyChip({ value, goal, pct }: { value: number; goal: number; pct: number }) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex items-center gap-2 rounded-full bg-card border border-border/60 pl-2.5 pr-3 py-1 shadow-soft min-h-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-saffron)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>
      <div className="leading-tight">
        <div className="font-counter text-sm text-maroon">{value}/{goal}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">today</div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  children,
  tone = "muted",
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  tone?: "muted" | "saffron";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`h-14 w-14 rounded-full bg-card border border-border shadow-soft flex items-center justify-center active:scale-95 transition ${
        tone === "saffron" ? "text-saffron" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
