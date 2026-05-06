import Dexie, { type Table } from "dexie";

/**
 * Sumiran offline DB — IndexedDB via Dexie.
 *
 * V1 schema:
 *   meta:    key/value blob (mantra, dailyGoal, settings, lastSeenDate, beads)
 *   history: per-day chant counters
 *
 * Designed to be tiny and forgiving:
 *  - all writes are fire-and-forget
 *  - failures never crash the UI (in-memory store remains source of truth)
 */

export type SoundOption = "ghanti" | "shankh" | "om";

export interface Settings {
  haptics: boolean;
  sound: SoundOption;
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM"
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface HistoryRow {
  date: string; // YYYY-MM-DD
  chants: number;
}

class SumiranDB extends Dexie {
  meta!: Table<MetaRow, string>;
  history!: Table<HistoryRow, string>;

  constructor() {
    super("sumiran");
    this.version(1).stores({
      meta: "key",
      history: "date",
    });
  }
}

export const db = new SumiranDB();

/* ---------- Helpers ---------- */

export async function loadMeta<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await db.meta.get(key);
    return row ? (row.value as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveMeta(key: string, value: unknown): Promise<void> {
  try {
    await db.meta.put({ key, value });
  } catch {
    /* ignore — IDB may be blocked in private mode */
  }
}

export async function loadHistory(): Promise<Record<string, number>> {
  try {
    const rows = await db.history.toArray();
    const out: Record<string, number> = {};
    rows.forEach((r) => (out[r.date] = r.chants));
    return out;
  } catch {
    return {};
  }
}

export async function saveDayChants(date: string, chants: number): Promise<void> {
  try {
    await db.history.put({ date, chants });
  } catch {
    /* ignore */
  }
}
