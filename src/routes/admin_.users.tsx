import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { useIsAdmin } from "@/store/admin";
import { useAuth } from "@/store/auth";
import {
  listAllUsersWithRoles,
  grantAdmin,
  revokeAdmin,
  type AdminUserRow,
} from "@/services/supabase/admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/users")({
  head: () => ({ meta: [{ title: "Manage Users — Admin" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin, ready } = useIsAdmin();
  const me = useAuth((s) => s.user);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/" });
  }, [ready, isAdmin, navigate]);

  const reload = () => {
    setRows(null);
    listAllUsersWithRoles().then(setRows).catch(() => setRows([]));
  };

  useEffect(() => {
    if (!isAdmin) return;
    reload();
  }, [isAdmin]);

  const toggle = async (row: AdminUserRow) => {
    setBusyId(row.user_id);
    try {
      if (row.is_admin) {
        if (row.user_id === me?.id) {
          if (!confirm("Remove your own admin access? You won't be able to undo this from the app.")) {
            setBusyId(null);
            return;
          }
        }
        await revokeAdmin(row.user_id);
        toast.success(`Removed admin from ${row.display_name ?? "user"}`);
      } else {
        await grantAdmin(row.user_id);
        toast.success(`${row.display_name ?? "User"} is now admin`);
      }
      reload();
    } catch (e) {
      toast.error((e as Error).message || "Could not update role");
    } finally {
      setBusyId(null);
    }
  };

  if (!ready) {
    return (
      <AppShell>
        <Container className="pt-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron" />
        </Container>
      </AppShell>
    );
  }
  if (!isAdmin) return null;

  const filtered = (rows ?? []).filter((r) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      (r.display_name ?? "").toLowerCase().includes(t) ||
      (r.email ?? "").toLowerCase().includes(t) ||
      (r.phone ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <AppShell>
      <div className="safe-top px-3 pt-3 pb-2 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <Link
            to="/admin"
            aria-label="Back"
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="font-mantra text-lg text-maroon">Manage Users</div>
            <div className="text-xs text-muted-foreground">उपयोगकर्ता प्रबंधन</div>
          </div>
        </div>
      </div>

      <Container className="pt-4 pb-8 space-y-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search name, email, phone…"
          className="w-full h-14 px-4 rounded-2xl bg-card border border-border text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {rows === null ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-saffron" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No users.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((row) => (
              <li
                key={row.user_id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 shadow-soft"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base text-foreground truncate">
                    {row.display_name ?? "Devotee"}
                    {row.user_id === me?.id && (
                      <span className="ml-2 text-[10px] text-saffron font-bold">YOU</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {row.email ?? row.phone ?? "—"}
                  </div>
                </div>
                <button
                  onClick={() => toggle(row)}
                  disabled={busyId === row.user_id}
                  className={cn(
                    "h-12 px-4 rounded-2xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition",
                    row.is_admin
                      ? "bg-destructive/10 text-destructive"
                      : "bg-saffron text-primary-foreground",
                  )}
                >
                  {busyId === row.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : row.is_admin ? (
                    <>
                      <ShieldOff className="h-4 w-4" /> Revoke
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Make admin
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </AppShell>
  );
}
