import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { currentUserHasRole } from "@/services/supabase/admin";

/**
 * Reactive admin-role hook. Re-checks whenever the auth user changes.
 * Returns { isAdmin, ready } — `ready` lets callers avoid flicker.
 */
export function useIsAdmin(): { isAdmin: boolean; ready: boolean } {
  const userId = useAuth((s) => s.user?.id ?? null);
  const authReady = useAuth((s) => s.ready);
  const [state, setState] = useState<{ isAdmin: boolean; ready: boolean }>({
    isAdmin: false,
    ready: false,
  });

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      setState({ isAdmin: false, ready: true });
      return;
    }
    let cancelled = false;
    currentUserHasRole("admin").then((isAdmin) => {
      console.log("[useIsAdmin] userId:", userId, "isAdmin:", isAdmin);
      if (!cancelled) setState({ isAdmin, ready: true });
    }).catch((e) => {
      console.error("[useIsAdmin] error:", e);
      if (!cancelled) setState({ isAdmin: false, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, authReady]);

  return state;
}
