import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Hand,
  BookOpen,
  ScrollText,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { StreakBadge } from "@/components/sumiran/StreakBadge";
import { useCounter, selectStreakLite, selectMalasToday } from "@/store/counter";
import { loadMeta } from "@/storage/db";
import { useIsAdmin } from "@/store/admin";
import logo from "@/assets/sumiran-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sumiran — सुमिरन | Home" },
      {
        name: "description",
        content:
          "Sumiran home — choose Mala Jaap, Mantra, Chalisa, Mandali, Progress or Settings.",
      },
    ],
  }),
  component: HomeScreen,
});

type TilePath = "/jaap" | "/mantra" | "/chalisa" | "/mandali" | "/progress" | "/settings" | "/admin";

type Tile = {
  to: TilePath;
  label: string;
  hindi: string;
  desc: string;
  Icon: typeof Hand;
};

const TILES: Tile[] = [
  { to: "/jaap", label: "Mala Jaap", hindi: "माला जाप", desc: "Tap to count", Icon: Hand },
  { to: "/mantra", label: "Mantra", hindi: "मंत्र", desc: "Choose mantra", Icon: BookOpen },
  { to: "/chalisa", label: "Chalisa", hindi: "चालीसा", desc: "Read & recite", Icon: ScrollText },
  { to: "/mandali", label: "Mandali", hindi: "मंडली", desc: "Group sadhana", Icon: Users },
  { to: "/progress", label: "Progress", hindi: "प्रगति", desc: "Your journey", Icon: BarChart3 },
  { to: "/settings", label: "Settings", hindi: "सेटिंग्स", desc: "Reminder & more", Icon: SettingsIcon },
];

const ADMIN_TILE: Tile = {
  to: "/admin",
  label: "Admin",
  hindi: "व्यवस्थापक",
  desc: "Manage content",
  Icon: ShieldCheck,
};

function HomeScreen() {
  const navigate = useNavigate();
  const ready = useCounter((s) => s.ready);
  const streak = useCounter(selectStreakLite);
  const malasToday = useCounter((s) => selectMalasToday(s));
  const dailyGoal = useCounter((s) => s.dailyGoal);
  const { isAdmin } = useIsAdmin();
  const tiles = isAdmin ? [...TILES, ADMIN_TILE] : TILES;

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

  return (
    <AppShell>
      {/* Brand header */}
      <Container className="pt-6 pb-2 safe-top flex flex-col items-center text-center">
        <Link to="/" aria-label="Sumiran home">
          <img
            src={logo}
            alt="Sumiran"
            style={{ width: "120px", height: "120px" }}
            className="object-contain drop-shadow-[0_2px_10px_rgba(255,107,0,0.3)]"
          />
        </Link>
        <h1 className="mt-3 font-mantra text-4xl text-maroon leading-tight">सुमिरन</h1>
        <p className="mt-1 text-lg text-muted-foreground">Sumiran</p>
        {streak.current > 0 && (
          <div className="mt-3">
            <StreakBadge days={streak.current} />
          </div>
        )}
        <p className="mt-3 text-base text-foreground/80">
          आज <span className="font-counter text-saffron text-xl">{malasToday}</span> / {dailyGoal} माला
        </p>
      </Container>

      {/* Big tile menu */}
      <Container className="pt-4 pb-8">
        <div className="grid grid-cols-2 gap-4">
          {tiles.map(({ to, label, hindi, desc, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col items-center justify-center text-center rounded-3xl bg-card border border-border/60 shadow-soft px-3 py-6 min-h-[160px] active:scale-[0.97] transition"
              aria-label={`${label} — ${hindi}`}
            >
              <span
                aria-hidden
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--color-saffron) 22%, var(--color-card)) 0%, var(--color-card) 75%)",
                  boxShadow:
                    "inset 0 1px 0 color-mix(in oklab, var(--color-cream) 80%, transparent)",
                }}
              >
                <Icon className="h-9 w-9 text-saffron-deep" strokeWidth={2} />
              </span>
              <span className="font-mantra text-xl text-maroon leading-tight">{hindi}</span>
              <span className="mt-1 text-base font-semibold text-foreground">{label}</span>
              <span className="mt-0.5 text-sm text-muted-foreground">{desc}</span>
            </Link>
          ))}
        </div>
      </Container>
    </AppShell>
  );
}
