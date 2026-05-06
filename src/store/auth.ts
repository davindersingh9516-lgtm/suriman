import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  ready: boolean;
  user: User | null;
  session: Session | null;
}

const initial: AuthState = { ready: false, user: null, session: null };
let state: AuthState = initial;
const listeners = new Set<() => void>();

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

let inited = false;
export function initAuth(): void {
  if (inited) return;
  inited = true;

  // CRITICAL: subscribe BEFORE getSession to never miss an event.
  supabase.auth.onAuthStateChange((_evt, session) => {
    set({ ready: true, session, user: session?.user ?? null });
  });

  supabase.auth.getSession().then(({ data }) => {
    set({ ready: true, session: data.session, user: data.session?.user ?? null });
  });
}

export const authStore = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAuth<T>(selector: (s: AuthState) => T): T {
  const snapshot = useSyncExternalStore(authStore.subscribe, authStore.getState, () => initial);

  return selector(snapshot);
}
