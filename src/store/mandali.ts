import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMembers,
  fetchMyCurrentGroup,
  fetchTodaysChants,
  todayUtcDateStr,
  type DbGroup,
  type DbMember,
  type DbChant,
} from "@/services/supabase/mandali";

/**
 * Live Mandali store — backed by Supabase + Realtime.
 * UI subscribes via useMandali(); reads stay snappy because the in-memory
 * snapshot is the source of truth at render time.
 */

export interface MandaliView {
  ready: boolean;
  current: DbGroup | null;
  members: DbMember[];
  chantsToday: DbChant[]; // one row per member-with-activity
}

const initial: MandaliView = {
  ready: false,
  current: null,
  members: [],
  chantsToday: [],
};

let state: MandaliView = initial;
const listeners = new Set<() => void>();

function set(patch: Partial<MandaliView>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let activeGroupId: string | null = null;
let membersChannel: ReturnType<typeof supabase.channel> | null = null;
let chantsChannel: ReturnType<typeof supabase.channel> | null = null;

async function teardownChannels() {
  if (membersChannel) {
    await supabase.removeChannel(membersChannel);
    membersChannel = null;
  }
  if (chantsChannel) {
    await supabase.removeChannel(chantsChannel);
    chantsChannel = null;
  }
}

async function loadGroup(group: DbGroup) {
  const [members, chants] = await Promise.all([
    fetchMembers(group.id),
    fetchTodaysChants(group.id),
  ]);
  set({ current: group, members, chantsToday: chants, ready: true });
}

async function subscribeToGroup(groupId: string) {
  await teardownChannels();

  membersChannel = supabase
    .channel(`members:${groupId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` },
      async () => {
        const members = await fetchMembers(groupId);
        set({ members });
      },
    )
    .subscribe();

  chantsChannel = supabase
    .channel(`chants:${groupId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chants", filter: `group_id=eq.${groupId}` },
      (payload) => {
        const today = todayUtcDateStr();
        const row = (payload.new ?? payload.old) as DbChant;
        if (!row || row.date !== today) return;

        if (payload.eventType === "DELETE") {
          set({ chantsToday: state.chantsToday.filter((c) => c.id !== row.id) });
          return;
        }
        const next = [...state.chantsToday];
        const idx = next.findIndex((c) => c.user_id === row.user_id && c.date === row.date);
        if (idx >= 0) next[idx] = row;
        else next.push(row);
        set({ chantsToday: next });
      },
    )
    .subscribe();
}

export const mandaliStore = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Hydrate current group for signed-in user, then subscribe to realtime. */
  async hydrateForUser(userId: string | null) {
    if (!userId) {
      activeGroupId = null;
      await teardownChannels();
      set({ ...initial, ready: true });
      return;
    }

    const group = await fetchMyCurrentGroup();
    if (!group) {
      activeGroupId = null;
      await teardownChannels();
      set({ current: null, members: [], chantsToday: [], ready: true });
      return;
    }

    activeGroupId = group.id;
    await loadGroup(group);
    await subscribeToGroup(group.id);
  },

  /** Called after createGroup/joinGroup. */
  async setCurrent(group: DbGroup) {
    activeGroupId = group.id;
    await loadGroup(group);
    await subscribeToGroup(group.id);
  },

  async clear() {
    activeGroupId = null;
    await teardownChannels();
    set({ current: null, members: [], chantsToday: [], ready: true });
  },

  /** Optimistic local bump — realtime confirms it shortly after. */
  bumpLocalChant(userId: string, delta: number) {
    if (!state.current) return;
    const today = todayUtcDateStr();
    const next = [...state.chantsToday];
    const idx = next.findIndex((c) => c.user_id === userId && c.date === today);
    if (idx >= 0) {
      next[idx] = { ...next[idx], count: next[idx].count + delta };
    } else {
      next.push({
        id: `local-${userId}-${today}`,
        group_id: state.current.id,
        user_id: userId,
        date: today,
        count: delta,
      });
    }
    set({ chantsToday: next });
  },

  getActiveGroupId: () => activeGroupId,
};

export function useMandali<T>(selector: (s: MandaliView) => T): T {
  const snapshot = useSyncExternalStore(
    mandaliStore.subscribe,
    mandaliStore.getState,
    () => initial,
  );

  return selector(snapshot);
}

/* ---------- Selectors ---------- */

const MALA = 108;

export function selectGroupTodayChants(s: MandaliView): number {
  return s.chantsToday.reduce((sum, c) => sum + c.count, 0);
}

export function selectGroupGoalChants(s: MandaliView): number {
  return s.current ? s.current.goal_malas * MALA : 0;
}

export function selectMembersWithCounts(s: MandaliView, currentUserId: string | null) {
  return s.members
    .map((m) => {
      const c = s.chantsToday.find((x) => x.user_id === m.user_id);
      return {
        id: m.id,
        userId: m.user_id,
        name: m.display_name,
        todayCount: c?.count ?? 0,
        isYou: !!currentUserId && m.user_id === currentUserId,
      };
    })
    .sort((a, b) => b.todayCount - a.todayCount);
}
