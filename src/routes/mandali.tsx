import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Users, UserPlus, Share2, Crown, LogOut, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Card } from "@/components/sumiran/Card";
import { Progress } from "@/components/ui/progress";
import {
  useMandali,
  mandaliStore,
  selectGroupTodayChants,
  selectGroupGoalChants,
  selectMembersWithCounts,
} from "@/store/mandali";
import { useAuth } from "@/store/auth";
import { signOut } from "@/services/supabase/auth";
import { leaveGroup } from "@/services/supabase/mandali";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mandali")({
  head: () => ({
    meta: [
      { title: "Mandali — Sumiran" },
      {
        name: "description",
        content: "Chant together. Create or join a Mandali group for shared sadhana.",
      },
    ],
  }),
  component: MandaliScreen,
});

function MandaliScreen() {
  const navigate = useNavigate();
  const authReady = useAuth((s) => s.ready);
  const userId = useAuth((s) => s.user?.id ?? null);
  const ready = useMandali((s) => s.ready);
  const current = useMandali((s) => s.current);

  // Gate: must be signed in
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!authReady || userId || redirectedRef.current) return;
    redirectedRef.current = true;
    navigate({ to: "/auth", search: { redirect: "/mandali" } as never, replace: true });
  }, [authReady, userId, navigate]);

  if (!authReady || !userId) return <Loader />;
  if (!ready) return <LoaderInShell />;

  return (
    <AppShell>
      <Header title="Mandali" subtitle="Chant together · सामूहिक साधना" />
      <Container className="space-y-5">
        {current ? <InMandaliView /> : <EmptyMandaliView />}

        <button
          onClick={async () => {
            await signOut();
            await mandaliStore.clear();
          }}
          className="w-full text-center text-xs text-muted-foreground py-2 inline-flex items-center justify-center gap-1.5 hover:text-maroon"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </Container>
    </AppShell>
  );
}

function Loader() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-saffron" />
    </div>
  );
}

function LoaderInShell() {
  return (
    <AppShell>
      <Header title="Mandali" subtitle="Chant together · सामूहिक साधना" />
      <Container>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-saffron" />
        </div>
      </Container>
    </AppShell>
  );
}

/* ---------- Empty state: Create or Join ---------- */

function EmptyMandaliView() {
  return (
    <div className="space-y-4">
      <Card className="text-center py-7">
        <div className="mx-auto h-14 w-14 rounded-full bg-saffron/15 text-saffron flex items-center justify-center mb-3">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-maroon">Chant together</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a Mandali for your family or satsang, or join one with a code.
        </p>
      </Card>

      <Link
        to="/mandali/create"
        className={cn(
          "flex h-16 items-center justify-center gap-3 rounded-2xl",
          "bg-saffron text-primary-foreground font-semibold text-base shadow-elevated",
          "active:scale-[0.99] transition",
        )}
      >
        <Users className="h-5 w-5" />
        Create Mandali
      </Link>

      <Link
        to="/mandali/join"
        className={cn(
          "flex h-16 items-center justify-center gap-3 rounded-2xl",
          "bg-card text-maroon font-semibold text-base border-2 border-saffron/70",
          "active:scale-[0.99] transition hover:bg-saffron/5",
        )}
      >
        <UserPlus className="h-5 w-5" />
        Join Mandali
      </Link>
    </div>
  );
}

/* ---------- In-Mandali state ---------- */

const MALA = 108;

function InMandaliView() {
  const current = useMandali((s) => s.current);
  const totalChants = useMandali(selectGroupTodayChants);
  const goalChants = useMandali(selectGroupGoalChants);
  const userId = useAuth((s) => s.user?.id ?? null);
  const members = useMandali((s) => selectMembersWithCounts(s, userId));

  // Subtle pulse when total changes from another contributor
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(totalChants);
  useEffect(() => {
    if (totalChants > prevTotal.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 900);
      return () => window.clearTimeout(t);
    }
    prevTotal.current = totalChants;
  }, [totalChants]);

  if (!current) return null;

  const pct = goalChants > 0 ? Math.min(100, Math.round((totalChants / goalChants) * 100)) : 0;
  const remainingChants = Math.max(0, goalChants - totalChants);
  const remainingMalas = Math.ceil(remainingChants / MALA);
  const goalReached = remainingChants === 0 && goalChants > 0;
  const activeMembers = members.filter((m) => m.todayCount > 0).length;

  const onInvite = async () => {
    const appLink =
      typeof window !== "undefined"
        ? `${window.location.origin}/mandali`
        : "https://sumiran.app";
    const message =
      `🙏 Join our Jaap Mandali on Sumiran\n\n` +
      `We are doing daily mantra chanting together.\n\n` +
      `Join using code: ${current.code}\n\n` +
      `Download app: ${appLink}`;

    // 1) Native share sheet (mobile WhatsApp will appear here)
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Sumiran Mandali", text: message });
        return;
      }
    } catch {
      /* user cancelled — fall through to wa.me */
    }

    // 2) WhatsApp deep link (works on mobile + desktop web)
    if (typeof window !== "undefined") {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // 3) Final fallback: clipboard
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
      }
    } catch {
      /* ignore */
    }
  };

  const onLeave = async () => {
    if (typeof window !== "undefined" && !window.confirm("Leave this Mandali?")) return;
    await leaveGroup(current.id);
    await mandaliStore.clear();
  };

  return (
    <div className="space-y-5">
      <Card className="text-center py-6">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Mandali
        </div>
        <h2 className="mt-1 text-xl font-semibold text-maroon">{current.name}</h2>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold-soft/60 border border-gold/40 px-3 py-1">
          <span className="text-[10px] uppercase tracking-widest text-maroon font-semibold">
            Code
          </span>
          <span className="font-counter text-base text-maroon tabular-nums">
            {current.code}
          </span>
        </div>
      </Card>

      <Card className="text-center py-7 relative overflow-hidden">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Today we have chanted together
        </div>
        <div
          className={cn(
            "mt-2 font-counter text-6xl text-saffron tabular-nums leading-none transition-transform duration-500",
            pulse && "scale-[1.06]",
          )}
        >
          {totalChants.toLocaleString("en-IN")}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Goal: {goalChants.toLocaleString("en-IN")} chants ({current.goal_malas} malas)
        </div>
        <div className="mt-4">
          <Progress value={pct} className="h-3 bg-saffron/15" />
          <div className="mt-2 text-xs">
            {goalReached ? (
              <span className="inline-flex items-center gap-1 text-saffron font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Today's goal complete — {pct}%
              </span>
            ) : totalChants === 0 ? (
              <span className="text-muted-foreground">
                Be the first to chant today 🙏
              </span>
            ) : (
              <span className="text-maroon font-medium">
                Only {remainingMalas} {remainingMalas === 1 ? "mala" : "malas"} left to complete today's goal
              </span>
            )}
          </div>
        </div>

        {/* subtle pulse ring on update */}
        {pulse && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-saffron/40 animate-ping"
          />
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Leaderboard
            </div>
            <div className="mt-0.5 text-base font-semibold text-foreground">
              {activeMembers > 0
                ? `${activeMembers} chanting today`
                : `${members.length} ${members.length === 1 ? "member" : "members"}`}
            </div>
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyMembers />
        ) : activeMembers === 0 ? (
          <EmptyChantsToday members={members} />
        ) : (
          <ul className="divide-y divide-border/60">
            {members.map((m, idx) => {
              const rank = idx + 1;
              const isTop = rank === 1 && m.todayCount > 0;
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 py-3 transition-colors",
                    m.isYou && "rounded-xl -mx-2 px-2 bg-saffron/10",
                    isTop && !m.isYou && "rounded-xl -mx-2 px-2 bg-gold-soft/30",
                  )}
                >
                  <RankBadge rank={rank} active={m.todayCount > 0} />
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center font-semibold shrink-0",
                      m.isYou
                        ? "bg-saffron text-primary-foreground"
                        : "bg-cream-deep text-maroon border border-border",
                    )}
                  >
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {m.name}
                        {m.isYou && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-saffron">
                            You
                          </span>
                        )}
                      </p>
                      {isTop && (
                        <Crown className="h-3.5 w-3.5 text-gold" aria-hidden />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.todayCount > 0
                        ? `${m.todayCount.toLocaleString("en-IN")} chants today`
                        : "Yet to chant today"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <button
        onClick={onInvite}
        className={cn(
          "w-full h-14 rounded-2xl bg-saffron text-primary-foreground font-semibold text-base shadow-elevated",
          "flex items-center justify-center gap-2 active:scale-[0.99] transition",
        )}
      >
        <Share2 className="h-5 w-5" />
        Invite on WhatsApp
      </button>

      <button
        onClick={onLeave}
        className="w-full text-center text-xs text-muted-foreground py-2 hover:text-destructive"
      >
        Leave Mandali
      </button>
    </div>
  );
}

function RankBadge({ rank, active }: { rank: number; active: boolean }) {
  const styles =
    !active
      ? "bg-muted text-muted-foreground"
      : rank === 1
        ? "bg-gold text-maroon"
        : rank === 2
          ? "bg-gold-soft text-maroon"
          : rank === 3
            ? "bg-cream-deep text-maroon border border-gold/40"
            : "bg-cream-deep text-muted-foreground";
  return (
    <div
      className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums shrink-0",
        styles,
      )}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}

function EmptyMembers() {
  return (
    <div className="text-center py-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-saffron/10 text-saffron flex items-center justify-center mb-2">
        <UserPlus className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-foreground">No one here yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Invite your family — chanting feels stronger together.
      </p>
    </div>
  );
}

function EmptyChantsToday({ members }: { members: { id: string }[] }) {
  return (
    <div className="text-center py-5">
      <div className="text-2xl">🪔</div>
      <p className="mt-1 text-sm font-medium text-foreground">A fresh new day</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {members.length} {members.length === 1 ? "member is" : "members are"} ready. Be the first to start today's sadhana.
      </p>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "•";
}
