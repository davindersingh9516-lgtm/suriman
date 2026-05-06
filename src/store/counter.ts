import { useSyncExternalStore } from "react";
import { DEFAULT_MALA } from "@/utils/constants";
import {
  db,
  loadHistory,
  loadMeta,
  saveDayChants,
  saveMeta,
  type Settings,
  type SoundOption,
} from "@/storage/db";

/**
 * Sumiran global store — vanilla pub/sub backed by Dexie/IndexedDB.
 *
 *  - In-memory state is the single source of truth at runtime.
 *  - Every mutation persists to IndexedDB asynchronously.
 *  - On boot we hydrate from IndexedDB (see `hydrate()`); seeds only kick in
 *    when the DB is genuinely empty (first launch).
 */

export type DailyHistory = Record<string, number>;

export interface CounterState {
  ready: boolean;                 // hydration complete
  beads: number;
  totalChants: number;            // lifetime chants (derived from history sum)
  dailyGoal: number;
  mantra: { hi: string; en: string; id: string };
  history: DailyHistory;
  badges: Record<string, number>; // badgeId -> earnedAt timestamp
  streakMilestones: Record<number, number>; // milestone day -> celebratedAt
  settings: Settings;
  lastSeenDate: string;           // for midnight reset
  lastTapAt: number;
  justCompletedMala: boolean;
  firstMalaOfDayAt: number;       // timestamp when today's 1st mala completed (0 if none)
  streakResetSeen: boolean;       // we've already shown the gentle "let's start again" once
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  sound: "ghanti",
  reminderEnabled: true,
  reminderTime: "07:00",
};

const DEFAULT_MANTRA = {
  id: "om-namah-shivaya",
  hi: "ॐ नमः शिवाय",
  en: "Om Namah Shivaya",
};

// No seed/demo data — every user starts fresh with real chants only.

const initial: CounterState = {
  ready: false,
  beads: 0,
  totalChants: 0,
  dailyGoal: 5,
  mantra: DEFAULT_MANTRA,
  history: {},
  badges: {},
  streakMilestones: {},
  settings: DEFAULT_SETTINGS,
  lastSeenDate: todayKey(),
  lastTapAt: 0,
  justCompletedMala: false,
  firstMalaOfDayAt: 0,
  streakResetSeen: true,
};

let state: CounterState = initial;
const listeners = new Set<() => void>();

function set(partial: Partial<CounterState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

function recomputeTotal(history: DailyHistory): number {
  let sum = 0;
  for (const v of Object.values(history)) sum += v;
  return sum;
}

/* ---------- Hydration & daily reset ---------- */

let hydratePromise: Promise<void> | null = null;

export function hydrate(): Promise<void> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const [history, meta] = await Promise.all([
        loadHistory(),
        Promise.all([
          loadMeta<number>("beads", 0),
          loadMeta<number>("dailyGoal", 5),
          loadMeta<typeof DEFAULT_MANTRA>("mantra", DEFAULT_MANTRA),
          loadMeta<Settings>("settings", DEFAULT_SETTINGS),
          loadMeta<string>("lastSeenDate", todayKey()),
          loadMeta<Record<string, number>>("badges", {}),
          loadMeta<Record<number, number>>("streakMilestones", {}),
          loadMeta<string>("lastStreakDate", ""),
        ]),
      ]);
      const [beads, dailyGoal, mantra, settings, lastSeenDate, badges, streakMilestones, lastStreakDate] = meta;

      // No seed: real chants only.
      const finalHistory = history;

      // Daily reset
      const today = todayKey();
      const beadsToday = lastSeenDate === today ? beads : 0;
      if (lastSeenDate !== today) await saveMeta("beads", 0);
      await saveMeta("lastSeenDate", today);

      // Detect a streak break: had a streak day in the past but not yesterday/today.
      // Only show the gentle reminder once per detected break.
      let streakResetSeen = true;
      if (lastStreakDate) {
        const last = new Date(lastStreakDate);
        const t = new Date(today);
        const diffDays = Math.floor((t.getTime() - last.getTime()) / 86_400_000);
        // diff >= 2 means user missed at least one full day after their last streak day
        if (diffDays >= 2 && (finalHistory[today] ?? 0) === 0) {
          streakResetSeen = false;
        }
      }

      set({
        ready: true,
        beads: beadsToday,
        dailyGoal,
        mantra,
        settings: { ...DEFAULT_SETTINGS, ...settings },
        history: finalHistory,
        badges: badges ?? {},
        streakMilestones: streakMilestones ?? {},
        totalChants: recomputeTotal(finalHistory),
        lastSeenDate: today,
        firstMalaOfDayAt: 0,
        streakResetSeen,
      });
      // Backfill badges based on current state (e.g. seed crossed a threshold)
      evaluateBadges();
    } catch {
      // DB unavailable — run with empty in-memory state
      set({ ready: true, history: {}, totalChants: 0 });
    }
  })();
  return hydratePromise;
}

/** Call periodically (and on focus) — flips beads to 0 at midnight. */
export function checkDailyReset(): void {
  const today = todayKey();
  if (state.lastSeenDate !== today) {
    set({ beads: 0, lastSeenDate: today, justCompletedMala: false });
    saveMeta("beads", 0);
    saveMeta("lastSeenDate", today);
  }
}

/* ---------- Mutations ---------- */

export const counterStore = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  tap() {
    checkDailyReset();
    const key = todayKey();
    const next = state.beads + 1;
    const malaJustDone = next >= DEFAULT_MALA;
    const newBeads = malaJustDone ? 0 : next;
    const todayChants = (state.history[key] ?? 0) + 1;
    const history = { ...state.history, [key]: todayChants };

    // First mala of the day completed (transition from <108 → ≥108)
    const isFirstMalaToday =
      malaJustDone && (state.history[key] ?? 0) < DEFAULT_MALA;

    set({
      beads: newBeads,
      totalChants: state.totalChants + 1,
      history,
      lastTapAt: Date.now(),
      justCompletedMala: malaJustDone,
      firstMalaOfDayAt: isFirstMalaToday ? Date.now() : state.firstMalaOfDayAt,
    });

    // Persist (fire-and-forget)
    saveMeta("beads", newBeads);
    saveDayChants(key, todayChants);
    if (isFirstMalaToday) {
      saveMeta("lastStreakDate", key);
    }

    // Mirror to Mandali backend ONLY if user is in a group.
    // Lazy-loaded to keep the offline tap path lightweight.
    void import("@/services/groupSync").then((m) => m.recordChantForGroup());

    // Mirror to personal cloud history if signed in (independent of Mandali).
    void import("@/services/userChantsSync").then((m) => m.recordChantForUser());

    if (malaJustDone) {
      setTimeout(() => set({ justCompletedMala: false }), 1600);
    }
  },
  acknowledgeStreakReset() {
    set({ streakResetSeen: true });
  },
  /** Merge cloud-pulled per-day counts into local history (cloud wins on conflict). */
  mergeRemoteHistory(remote: DailyHistory) {
    const merged: DailyHistory = { ...state.history };
    for (const [date, count] of Object.entries(remote)) {
      // Cloud is the source of truth for personal history once signed in.
      merged[date] = Math.max(merged[date] ?? 0, count);
    }
    set({ history: merged, totalChants: recomputeTotal(merged) });
    // Persist locally so offline reloads stay current
    void Promise.all(
      Object.entries(merged).map(([d, c]) => saveDayChants(d, c)),
    );
    evaluateBadges();
  },
  consumeFirstMalaFlag() {
    if (state.firstMalaOfDayAt > 0) set({ firstMalaOfDayAt: 0 });
  },
  markMilestoneCelebrated(day: number) {
    const merged = { ...state.streakMilestones, [day]: Date.now() };
    set({ streakMilestones: merged });
    saveMeta("streakMilestones", merged);
  },
  reset() {
    set({ beads: 0, justCompletedMala: false });
    saveMeta("beads", 0);
  },
  setMantra(m: CounterState["mantra"]) {
    set({ mantra: m });
    saveMeta("mantra", m);
    void import("@/services/settingsSync").then((s) =>
      s.queueSettingsPush({ mantra: m }),
    );
  },
  setDailyGoal(n: number) {
    const clamped = Math.max(1, Math.min(108, Math.round(n)));
    set({ dailyGoal: clamped });
    saveMeta("dailyGoal", clamped);
    void import("@/services/settingsSync").then((s) =>
      s.queueSettingsPush({ daily_goal: clamped }),
    );
  },
  setSettings(patch: Partial<Settings>) {
    const next = { ...state.settings, ...patch };
    set({ settings: next });
    saveMeta("settings", next);
    void import("@/services/settingsSync").then((s) =>
      s.queueSettingsPush({
        haptics: next.haptics,
        sound: next.sound,
        reminder_enabled: next.reminderEnabled,
        reminder_time: next.reminderTime,
      }),
    );
  },
  /** Silent apply (no cloud re-push). Used by settingsSync.pullUserSettings. */
  applyRemoteSettings(patch: { dailyGoal?: number; mantra?: CounterState["mantra"]; settings?: Partial<Settings> }) {
    const nextSettings = patch.settings
      ? { ...state.settings, ...patch.settings }
      : state.settings;
    set({
      dailyGoal: patch.dailyGoal ?? state.dailyGoal,
      mantra: patch.mantra ?? state.mantra,
      settings: nextSettings,
    });
    if (patch.dailyGoal !== undefined) saveMeta("dailyGoal", patch.dailyGoal);
    if (patch.mantra !== undefined) saveMeta("mantra", patch.mantra);
    if (patch.settings) saveMeta("settings", nextSettings);
  },
  async clearAll() {
    try {
      await db.history.clear();
      await db.meta.clear();
    } catch { /* noop */ }
    set({
      beads: 0,
      totalChants: 0,
      history: {},
      badges: {},
      streakMilestones: {},
      dailyGoal: 5,
      mantra: DEFAULT_MANTRA,
      settings: DEFAULT_SETTINGS,
      justCompletedMala: false,
      firstMalaOfDayAt: 0,
      streakResetSeen: true,
    });
  },
};

export function useCounter<T>(selector: (s: CounterState) => T): T {
  return useSyncExternalStore(
    counterStore.subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

/* ---------- Derived selectors ---------- */

export function selectMalasToday(s: CounterState): number {
  return Math.floor((s.history[todayKey()] ?? 0) / DEFAULT_MALA);
}

export function selectTotalMalas(s: CounterState): number {
  return Math.floor(s.totalChants / DEFAULT_MALA);
}

/**
 * "Lite" streak — at least 1 completed mala (≥108 chants) on a day counts.
 * Used for the daily-habit streak badge & milestone celebrations.
 */
const streakLiteCache = new WeakMap<CounterState, { current: number; longest: number }>();

export function selectStreakLite(s: CounterState): { current: number; longest: number } {
  const cached = streakLiteCache.get(s);
  if (cached) return cached;
  const meets = (key: string) => (s.history[key] ?? 0) >= DEFAULT_MALA;

  let current = 0;
  const today = new Date();
  // If today not yet done, count back from yesterday (streak still alive).
  let cursor = meets(todayKey(today)) ? 0 : -1;
  while (true) {
    const key = todayKey(shiftDate(today, cursor));
    if (meets(key)) {
      current += 1;
      cursor -= 1;
    } else break;
  }

  const keys = Array.from(new Set([...Object.keys(s.history), todayKey()])).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(k);
    if (!meets(k)) { run = 0; prev = d; continue; }
    if (prev && d.getTime() - prev.getTime() === 86_400_000) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  const result = { current, longest };
  streakLiteCache.set(s, result);
  return result;
}

export const STREAK_MILESTONES = [3, 7, 21, 108] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

const streakCache = new WeakMap<CounterState, { current: number; longest: number }>();

export function selectStreak(s: CounterState): { current: number; longest: number } {
  const cached = streakCache.get(s);
  if (cached) return cached;
  const goalChants = s.dailyGoal * DEFAULT_MALA;
  const meets = (key: string) => (s.history[key] ?? 0) >= goalChants;

  let current = 0;
  const today = new Date();
  let cursor = meets(todayKey(today)) ? 0 : -1;
  while (true) {
    const key = todayKey(shiftDate(today, cursor));
    if (meets(key)) {
      current += 1;
      cursor -= 1;
    } else break;
  }

  const keys = Array.from(new Set([...Object.keys(s.history), todayKey()])).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(k);
    if (!meets(k)) {
      run = 0;
      prev = d;
      continue;
    }
    if (prev && d.getTime() - prev.getTime() === 86400000) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  const result = { current, longest };
  streakCache.set(s, result);
  return result;
}

type HeatmapEntry = { date: string; chants: number; level: 0 | 1 | 2 | 3 | 4 };
const heatmapCache = new WeakMap<CounterState, Map<number, HeatmapEntry[]>>();

export function selectHeatmap(s: CounterState, days = 30): HeatmapEntry[] {
  let perState = heatmapCache.get(s);
  if (perState) {
    const cached = perState.get(days);
    if (cached) return cached;
  } else {
    perState = new Map();
    heatmapCache.set(s, perState);
  }
  const goal = s.dailyGoal * DEFAULT_MALA;
  const today = new Date();
  const out: HeatmapEntry[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = todayKey(shiftDate(today, -i));
    const c = s.history[key] ?? 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (c > 0) {
      const ratio = c / goal;
      if (ratio >= 1) level = 4;
      else if (ratio >= 0.66) level = 3;
      else if (ratio >= 0.33) level = 2;
      else level = 1;
    }
    out.push({ date: key, chants: c, level });
  }
  perState.set(days, out);
  return out;
}

export interface AchievementBadge {
  id: string;
  label: string;
  earned: boolean;
  earnedAt?: number;
  isNew?: boolean;
}

const BADGE_RULES: { id: string; label: string; check: (s: CounterState) => boolean }[] = [
  { id: "first-mala",   label: "First Mala",     check: (s) => selectTotalMalas(s) >= 1 },
  { id: "7-day-streak", label: "7-Day Streak",   check: (s) => selectStreak(s).longest >= 7 },
  { id: "30-day-streak",label: "30-Day Streak",  check: (s) => selectStreak(s).longest >= 30 },
  { id: "1k-chants",    label: "1,000 Chants",   check: (s) => s.totalChants >= 1000 },
  { id: "10k-chants",   label: "10,000 Chants",  check: (s) => s.totalChants >= 10000 },
  { id: "108-malas",    label: "108 Malas",      check: (s) => selectTotalMalas(s) >= 108 },
];

const badgesCache = new WeakMap<CounterState, AchievementBadge[]>();

export function selectBadges(s: CounterState): AchievementBadge[] {
  const cached = badgesCache.get(s);
  if (cached) return cached;
  const out = BADGE_RULES.map((r) => {
    const earned = r.check(s);
    const earnedAt = s.badges[r.id];
    return {
      id: r.id,
      label: r.label,
      earned,
      earnedAt,
      isNew: earned && !!earnedAt && Date.now() - earnedAt < 24 * 3600 * 1000,
    };
  });
  badgesCache.set(s, out);
  return out;
}


/** Evaluate badge rules and persist any newly earned ones. Returns ids unlocked just now. */
export function evaluateBadges(): string[] {
  const s = state;
  const updates: Record<string, number> = {};
  const newly: string[] = [];
  for (const r of BADGE_RULES) {
    if (r.check(s) && !s.badges[r.id]) {
      updates[r.id] = Date.now();
      newly.push(r.id);
    }
  }
  if (newly.length > 0) {
    const merged = { ...s.badges, ...updates };
    set({ badges: merged });
    saveMeta("badges", merged);
  }
  return newly;
}

export type { Settings, SoundOption };
