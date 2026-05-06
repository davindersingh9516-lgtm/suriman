import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Check, Sparkles, Target, BookOpen } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Input } from "@/components/sumiran/Input";
import { counterStore, useCounter } from "@/store/counter";
import { saveMeta, loadMeta } from "@/storage/db";
import { MANTRAS } from "@/services/mantras";
import { cn } from "@/lib/utils";
import logo from "@/assets/sumiran-logo.png";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Sumiran" },
      { name: "description", content: "Begin your daily mantra practice in 3 calm taps." },
    ],
  }),
  component: OnboardingScreen,
});

type Step = 0 | 1 | 2 | 3;

function OnboardingScreen() {
  const navigate = useNavigate();
  const ready = useCounter((s) => s.ready);
  const currentMantra = useCounter((s) => s.mantra);
  const currentGoal = useCounter((s) => s.dailyGoal);

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [mantraId, setMantraId] = useState<string>(currentMantra.id);
  const [goal, setGoal] = useState<number>(currentGoal || 1);

  // Sync defaults once hydrated
  useEffect(() => {
    if (ready) {
      setMantraId((m) => m || currentMantra.id);
      setGoal((g) => g || currentGoal || 1);
    }
  }, [ready, currentMantra.id, currentGoal]);

  // If already onboarded, send them home
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const done = await loadMeta<boolean>("onboarded", false);
      if (done && !cancelled) navigate({ to: "/" });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const finish = async () => {
    const m = MANTRAS.find((x) => x.id === mantraId) ?? MANTRAS[0];
    counterStore.setMantra({ id: m.id, hi: m.hi, en: m.en });
    counterStore.setDailyGoal(goal);
    if (name.trim().length >= 2) {
      await saveMeta("displayName", name.trim());
    }
    await saveMeta("onboarded", true);
    navigate({ to: "/" });
  };

  const skip = async () => {
    await saveMeta("onboarded", true);
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <Container className="pt-6 pb-6 safe-top">
        <div className="flex items-center justify-between">
          <Dots step={step} total={4} />
          {step < 3 && (
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-maroon"
            >
              Skip
            </button>
          )}
        </div>
      </Container>

      <Container className="pb-10">
        {step === 0 && <Welcome onNext={() => setStep(1)} name={name} setName={setName} />}
        {step === 1 && (
          <PickMantra
            value={mantraId}
            onChange={setMantraId}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <PickGoal value={goal} onChange={setGoal} onNext={() => setStep(3)} />
        )}
        {step === 3 && <ReadyScreen mantraId={mantraId} goal={goal} onStart={finish} />}
      </Container>
    </AppShell>
  );
}

/* ---------- Step 0: Welcome ---------- */

function Welcome({
  onNext,
  name,
  setName,
}: {
  onNext: () => void;
  name: string;
  setName: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        <img
          src={logo}
          alt="Sumiran"
          className="mx-auto h-20 w-20 object-contain drop-shadow-[0_2px_8px_rgba(255,107,0,0.25)]"
        />
        <h1 className="mt-4 font-mantra text-3xl text-maroon">सुमिरन</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sumiran — daily mantra companion</p>
      </div>

      <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
        <p className="text-base text-foreground leading-relaxed">
          A calm, offline-first japa counter — built for daily sadhana, alone or with your family.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <Feature icon={<BookOpen className="h-4 w-4" />}>Pick your favourite mantra</Feature>
          <Feature icon={<Target className="h-4 w-4" />}>Set a gentle daily goal</Feature>
          <Feature icon={<Sparkles className="h-4 w-4" />}>Chant together in a Mandali</Feature>
        </ul>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-semibold text-foreground">
          What should we call you?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ramesh"
          maxLength={40}
          className="text-lg"
        />
      </div>

      <NextButton onClick={onNext}>Begin</NextButton>
    </div>
  );
}

/* ---------- Step 1: Pick mantra ---------- */

function PickMantra({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <Heading
        eyebrow="Step 2 of 4"
        title="Choose your mantra"
        subtitle="You can change this any time."
      />

      <ul className="space-y-2 max-h-[58vh] overflow-y-auto pr-1 -mr-1">
        {MANTRAS.map((m) => {
          const selected = m.id === value;
          return (
            <li key={m.id}>
              <button
                onClick={() => onChange(m.id)}
                className={cn(
                  "w-full text-left rounded-2xl border-2 px-4 py-3 transition active:scale-[0.99]",
                  selected
                    ? "border-saffron bg-saffron/8"
                    : "border-border bg-card hover:border-saffron/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mantra text-lg text-maroon leading-tight truncate">
                      {m.hi}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.en} · {m.deity}
                    </p>
                  </div>
                  {selected && (
                    <div className="h-6 w-6 rounded-full bg-saffron text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <NextButton onClick={onNext}>Continue</NextButton>
    </div>
  );
}

/* ---------- Step 2: Daily goal ---------- */

const GOAL_OPTIONS = [1, 3, 5, 11, 21] as const;

function PickGoal({
  value,
  onChange,
  onNext,
}: {
  value: number;
  onChange: (n: number) => void;
  onNext: () => void;
}) {
  const minutes = useMemo(() => Math.round((value * 108 * 2.5) / 60), [value]); // ~2.5s/chant
  return (
    <div className="space-y-6">
      <Heading
        eyebrow="Step 3 of 4"
        title="Set a daily goal"
        subtitle="How many malas would you like to chant each day? (1 mala = 108 chants)"
      />

      <div className="grid grid-cols-5 gap-2">
        {GOAL_OPTIONS.map((n) => {
          const selected = n === value;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={cn(
                "h-16 rounded-2xl border-2 font-counter text-2xl tabular-nums transition active:scale-[0.97]",
                selected
                  ? "border-saffron bg-saffron text-primary-foreground"
                  : "border-border bg-card text-maroon hover:border-saffron/40",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl bg-gold-soft/40 border border-gold/30 px-4 py-3 text-center">
        <p className="text-sm text-maroon">
          <span className="font-semibold">{value} {value === 1 ? "mala" : "malas"}</span> a day
          {" · "}
          <span className="text-muted-foreground">~{minutes} min</span>
        </p>
      </div>

      <NextButton onClick={onNext}>Continue</NextButton>
    </div>
  );
}

/* ---------- Step 3: Ready ---------- */

function ReadyScreen({
  mantraId,
  goal,
  onStart,
}: {
  mantraId: string;
  goal: number;
  onStart: () => void;
}) {
  const m = MANTRAS.find((x) => x.id === mantraId) ?? MANTRAS[0];
  return (
    <div className="space-y-6 text-center">
      <Heading eyebrow="Step 4 of 4" title="You're ready 🙏" subtitle="" />

      <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-elevated">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Your mantra</p>
        <p className="mt-2 font-mantra text-3xl text-maroon leading-tight">{m.hi}</p>
        <p className="mt-1 text-sm text-muted-foreground">{m.en}</p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-saffron/10 border border-saffron/30 px-3 py-1.5">
          <Target className="h-3.5 w-3.5 text-saffron" />
          <span className="text-sm font-semibold text-maroon">
            {goal} {goal === 1 ? "mala" : "malas"} a day
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Tap the bead circle to count. Long-press to reset.
      </p>

      <NextButton onClick={onStart}>Start chanting</NextButton>
    </div>
  );
}

/* ---------- Shared ---------- */

function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === step ? "w-6 bg-saffron" : i < step ? "w-3 bg-saffron/50" : "w-3 bg-border",
          )}
        />
      ))}
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold text-maroon">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="h-7 w-7 rounded-full bg-saffron/10 text-saffron flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="text-foreground">{children}</span>
    </li>
  );
}

function NextButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-14 rounded-2xl bg-saffron text-primary-foreground font-semibold text-base shadow-elevated",
        "flex items-center justify-center gap-2 active:scale-[0.99] transition",
      )}
    >
      {children}
      <ChevronRight className="h-5 w-5" />
    </button>
  );
}
