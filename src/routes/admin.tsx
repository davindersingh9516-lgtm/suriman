import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Users, BookOpen, Activity, ShieldCheck, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { useAuth } from "@/store/auth";
import { useIsAdmin } from "@/store/admin";
import { getAnalyticsSummary } from "@/services/supabase/content";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Sumiran" }, { name: "description", content: "Sumiran admin panel" }],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const authReady = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const { isAdmin, ready: roleReady } = useIsAdmin();

  const [stats, setStats] = useState<{
    totalUsers: number;
    totalGroups: number;
    chantsToday: number;
    chantsAllTime: number;
  } | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (roleReady && !isAdmin) {
      navigate({ to: "/" });
    }
  }, [authReady, user, roleReady, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    getAnalyticsSummary().then(setStats).catch(() => setStats(null));
  }, [isAdmin]);

  if (!authReady || !roleReady) {
    return (
      <AppShell>
        <Container className="pt-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron" />
        </Container>
      </AppShell>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppShell>
      <div className="safe-top px-3 pt-3 pb-2 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <Link
            to="/"
            aria-label="Back"
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="font-mantra text-lg text-maroon">Admin Panel</div>
            <div className="text-xs text-muted-foreground">व्यवस्थापक</div>
          </div>
          <ShieldCheck className="h-6 w-6 text-saffron" />
        </div>
      </div>

      <Container className="pt-5 pb-8 space-y-5">
        {/* Analytics */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3 px-1">Analytics</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Users" value={stats?.totalUsers} />
            <StatCard label="Mandalis" value={stats?.totalGroups} />
            <StatCard label="Chants Today" value={stats?.chantsToday} />
            <StatCard label="Chants All-time" value={stats?.chantsAllTime} />
          </div>
        </section>

        {/* Manage tiles */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3 px-1">Manage</h2>
          <div className="grid grid-cols-2 gap-3">
            <ManageTile to="/admin/content" Icon={BookOpen} label="Content" hindi="सामग्री" />
            <ManageTile to="/admin/users" Icon={Users} label="Users" hindi="उपयोगकर्ता" />
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground text-center pt-4">
          Signed in as <span className="font-semibold">{user?.email ?? user?.phone}</span>
        </p>
      </Container>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
      <div className="text-2xl font-counter text-saffron-deep">
        {value === undefined ? <Activity className="h-6 w-6 animate-pulse" /> : value.toLocaleString()}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ManageTile({
  to,
  Icon,
  label,
  hindi,
}: {
  to: "/admin/content" | "/admin/users";
  Icon: typeof Users;
  label: string;
  hindi: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center text-center rounded-3xl bg-card border border-border/60 shadow-soft px-3 py-6 min-h-[140px] active:scale-[0.97] transition"
    >
      <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron/10">
        <Icon className="h-7 w-7 text-saffron-deep" />
      </span>
      <span className="font-mantra text-lg text-maroon">{hindi}</span>
      <span className="mt-1 text-base font-semibold text-foreground">{label}</span>
    </Link>
  );
}
