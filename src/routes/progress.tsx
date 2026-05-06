import { createFileRoute } from "@tanstack/react-router";
import { Flame, Trophy, Sparkles, Star, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Card } from "@/components/sumiran/Card";
import { ProgressRing } from "@/components/sumiran/ProgressRing";
import {
  useCounter,
  selectMalasToday,
  selectTotalMalas,
  selectStreakLite,
  selectHeatmap,
  selectBadges,
} from "@/store/counter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Meri Sadhana — Sumiran" },
      { name: "description", content: "Your spiritual journey: streaks, sadhana and lifetime stats." },
    ],
  }),
  component: ProgressScreen,
});

function ProgressScreen() {
  const malasToday = useCounter(selectMalasToday);
  const dailyGoal = useCounter((s) => s.dailyGoal);
  const totalChants = useCounter((s) => s.totalChants);
  const totalMalas = useCounter(selectTotalMalas);
  const streak = useCounter(selectStreakLite);
  const heatmap = useCounter((s) => selectHeatmap(s, 30));
  const badges = useCounter(selectBadges);

  const pct = Math.min(100, Math.round((malasToday / dailyGoal) * 100));
  const goalMet = malasToday >= dailyGoal;

  return (
    <AppShell>
      <Header title="Meri Sadhana" subtitle="Your spiritual journey · मेरी साधना" />

      <Container className="space-y-5">
        {/* 1. Today */}
        <Card className="flex items-center gap-5 py-6">
          <ProgressRing value={pct} size={132} stroke={11}>
            <div className="text-center">
              <div className="font-counter text-3xl text-maroon leading-none">{malasToday}</div>
              <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">/ {dailyGoal}</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Today's Sadhana</div>
            <div className="mt-1 text-xl font-semibold text-foreground">
              {malasToday} of {dailyGoal} malas
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {goalMet
                ? "Goal complete. आज का संकल्प पूर्ण हुआ 🙏"
                : `${dailyGoal - malasToday} more to complete today`}
            </p>
          </div>
        </Card>

        {/* 2. Streak */}
        <div className="grid grid-cols-2 gap-3">
          <StreakCard
            icon={<Flame className="h-5 w-5" />}
            label="Current Streak"
            value={streak.current}
            unit="days"
            tone="saffron"
          />
          <StreakCard
            icon={<Trophy className="h-5 w-5" />}
            label="Longest"
            value={streak.longest}
            unit="days"
            tone="gold"
          />
        </div>

        {/* 3. Heatmap */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Last 30 Days</div>
              <div className="mt-0.5 text-base font-semibold text-foreground">Sadhana Map</div>
            </div>
            <Legend />
          </div>
          <Heatmap days={heatmap} />
        </Card>

        {/* 4. Lifetime */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Chants" value={totalChants.toLocaleString("en-IN")} />
          <StatCard label="Total Malas" value={totalMalas.toLocaleString("en-IN")} />
        </div>

        {/* 5. Badges */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-gold" />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Achievements</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => (
              <BadgeTile key={b.id} label={b.label} earned={b.earned} />
            ))}
          </div>
        </Card>
      </Container>
    </AppShell>
  );
}

/* ---------- Subcomponents ---------- */

function StreakCard({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  tone: "saffron" | "gold";
}) {
  return (
    <Card className="py-4">
      <div className={cn("flex items-center gap-2", tone === "saffron" ? "text-saffron" : "text-gold")}>
        {icon}
        <span className="text-[11px] uppercase tracking-widest font-semibold">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-counter text-3xl text-maroon">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="py-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-2 font-counter text-2xl text-foreground tabular-nums">{value}</div>
    </Card>
  );
}

function Heatmap({ days }: { days: { date: string; chants: number; level: 0 | 1 | 2 | 3 | 4 }[] }) {
  // 5 rows × 6 cols (oldest top-left → newest bottom-right). Reading flow feels natural.
  return (
    <div className="mt-3 grid grid-cols-6 gap-1.5">
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date} · ${d.chants} chants`}
          className={cn(
            "aspect-square rounded-md transition-colors",
            d.level === 0 && "bg-cream-deep border border-border/40",
            d.level === 1 && "bg-saffron/20",
            d.level === 2 && "bg-saffron/45",
            d.level === 3 && "bg-saffron/70",
            d.level === 4 && "bg-saffron",
          )}
        />
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 min-h-0">
      <span className="text-[10px] text-muted-foreground">less</span>
      {[0, 1, 2, 3, 4].map((l) => (
        <span
          key={l}
          className={cn(
            "h-2.5 w-2.5 rounded-sm",
            l === 0 && "bg-cream-deep border border-border/50",
            l === 1 && "bg-saffron/20",
            l === 2 && "bg-saffron/45",
            l === 3 && "bg-saffron/70",
            l === 4 && "bg-saffron",
          )}
        />
      ))}
      <span className="text-[10px] text-muted-foreground">more</span>
    </div>
  );
}

function BadgeTile({ label, earned }: { label: string; earned: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl p-3 text-center border transition-all min-h-0",
        earned
          ? "bg-gold-soft/60 border-gold/40 shadow-soft"
          : "bg-muted/40 border-border/50 opacity-55",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center",
          earned ? "bg-gold text-maroon" : "bg-card text-muted-foreground border border-border",
        )}
      >
        {earned ? <CheckCircle2 className="h-5 w-5" /> : <Star className="h-5 w-5" />}
      </div>
      <div className={cn("text-[11px] font-semibold leading-tight", earned ? "text-maroon" : "text-muted-foreground")}>
        {label}
      </div>
    </div>
  );
}
