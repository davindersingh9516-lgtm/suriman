import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Volume2,
  Vibrate,
  Share2,
  ExternalLink,
  Minus,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Card } from "@/components/sumiran/Card";
import { Toggle } from "@/components/sumiran/Toggle";
import { counterStore, useCounter, type SoundOption } from "@/store/counter";
import { bell } from "@/services/feedback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Sumiran" },
      { name: "description", content: "Personalize your Sumiran experience." },
    ],
  }),
  component: SettingsScreen,
});

const SOUND_OPTIONS: { id: SoundOption; label: string; hi: string }[] = [
  { id: "ghanti", label: "Ghanti", hi: "घंटी" },
  { id: "shankh", label: "Shankh", hi: "शंख" },
  { id: "om", label: "Om", hi: "ॐ" },
];

function SettingsScreen() {
  const dailyGoal = useCounter((s) => s.dailyGoal);
  const settings = useCounter((s) => s.settings);
  const [confirmReset, setConfirmReset] = useState(false);

  const updateGoal = (delta: number) => counterStore.setDailyGoal(dailyGoal + delta);

  const handleShare = async () => {
    const data = {
      title: "Sumiran — सुमिरन",
      text: "A calm, offline-first mantra counter. Begin your daily japa.",
      url: typeof window !== "undefined" ? window.location.origin : "",
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.url);
        alert("Link copied to clipboard");
      }
    } catch { /* user cancelled */ }
  };

  return (
    <AppShell>
      <Header title="Settings" subtitle="Personalize · अनुकूलन" />

      <Container className="space-y-4">
        {/* Daily Goal */}
        <Card>
          <SectionLabel>Daily Goal</SectionLabel>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Malas per day</div>
              <div className="font-counter text-3xl text-maroon mt-1">{dailyGoal}</div>
            </div>
            <div className="flex items-center gap-2">
              <Stepper aria-label="Decrease goal" onClick={() => updateGoal(-1)} disabled={dailyGoal <= 1}>
                <Minus className="h-5 w-5" />
              </Stepper>
              <Stepper aria-label="Increase goal" onClick={() => updateGoal(1)} disabled={dailyGoal >= 108}>
                <Plus className="h-5 w-5" />
              </Stepper>
            </div>
          </div>
        </Card>

        {/* Reminder */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBubble><Bell className="h-5 w-5" /></IconBubble>
              <div>
                <div className="text-base font-medium text-foreground">Daily Reminder</div>
                <div className="text-sm text-muted-foreground">A gentle nudge each day</div>
              </div>
            </div>
            <Toggle
              checked={settings.reminderEnabled}
              onChange={(v) => counterStore.setSettings({ reminderEnabled: v })}
              label="Daily reminder"
            />
          </div>
          {settings.reminderEnabled && (
            <div className="mt-4 flex items-center justify-between gap-3 pl-14">
              <label htmlFor="reminder-time" className="text-sm text-muted-foreground">
                Time
              </label>
              <input
                id="reminder-time"
                type="time"
                value={settings.reminderTime}
                onChange={(e) => counterStore.setSettings({ reminderTime: e.target.value })}
                className="h-12 px-4 rounded-xl bg-card border border-border text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </Card>

        {/* Sound */}
        <Card>
          <div className="flex items-center gap-3">
            <IconBubble><Volume2 className="h-5 w-5" /></IconBubble>
            <SectionLabel className="!mb-0">Sound</SectionLabel>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SOUND_OPTIONS.map((opt) => {
              const active = settings.sound === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    counterStore.setSettings({ sound: opt.id });
                    bell(0.18);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 transition-all",
                    active
                      ? "border-saffron bg-saffron/10 ring-2 ring-saffron/30"
                      : "border-border bg-card hover:border-saffron/40",
                  )}
                >
                  <span className={cn("font-mantra text-lg", active ? "text-maroon" : "text-foreground")}>
                    {opt.hi}
                  </span>
                  <span className={cn("text-xs", active ? "text-saffron font-semibold" : "text-muted-foreground")}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Haptics */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBubble><Vibrate className="h-5 w-5" /></IconBubble>
              <div>
                <div className="text-base font-medium text-foreground">Haptic Feedback</div>
                <div className="text-sm text-muted-foreground">Soft vibration on each tap</div>
              </div>
            </div>
            <Toggle
              checked={settings.haptics}
              onChange={(v) => counterStore.setSettings({ haptics: v })}
              label="Haptic feedback"
            />
          </div>
        </Card>

        {/* Share + External */}
        <Card className="!p-2 divide-y divide-border/60">
          <RowButton onClick={handleShare} icon={<Share2 className="h-5 w-5" />} title="Share Sumiran" subtitle="Spread the calm" />
          <RowButton
            onClick={() => window.open("https://prachinvichar.com", "_blank", "noopener,noreferrer")}
            icon={<ExternalLink className="h-5 w-5" />}
            title="PrachinVichar"
            subtitle="Visit our spiritual library"
          />
        </Card>

        {/* Danger */}
        <Card>
          <SectionLabel>Reset Data</SectionLabel>
          <p className="mt-1 text-sm text-muted-foreground">Clears all chants, malas and history.</p>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="mt-3 flex items-center gap-2 text-destructive font-medium text-sm h-12 px-4 rounded-xl border border-destructive/30 bg-destructive/5 active:scale-[0.98] transition"
            >
              <Trash2 className="h-4 w-4" /> Reset everything
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={async () => {
                  await counterStore.clearAll();
                  setConfirmReset(false);
                }}
                className="flex-1 h-12 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" /> Confirm
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 h-12 rounded-xl border border-border bg-card text-foreground font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </Card>

        <p className="text-center text-[11px] text-muted-foreground pt-2 pb-2">
          Sumiran v1 · ॐ
        </p>
      </Container>
    </AppShell>
  );
}

/* ---------- subcomponents ---------- */

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-1", className)}>
      {children}
    </div>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-11 w-11 rounded-2xl bg-saffron/12 text-saffron flex items-center justify-center shrink-0" style={{ background: "color-mix(in oklab, var(--color-saffron) 12%, transparent)" }}>
      {children}
    </div>
  );
}

function Stepper({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center text-maroon shadow-soft active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function RowButton({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-muted/40 rounded-xl transition-colors"
    >
      <IconBubble>{icon}</IconBubble>
      <div className="flex-1">
        <div className="text-base font-medium text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <span className="text-muted-foreground" aria-hidden>›</span>
    </button>
  );
}
