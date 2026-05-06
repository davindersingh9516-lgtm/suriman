import { incrementUserChant, fetchMyHistory } from "@/services/supabase/userChants";
import { authStore } from "@/store/auth";
import { counterStore } from "@/store/counter";

/**
 * Counter → Supabase sync for the personal chant history (works without a Mandali).
 *
 *  - On tap: queue +1 in pendingDelta. Flush after FLUSH_MS or 5s upper bound.
 *  - On login: fetch full cloud history and merge into local state.
 *  - On page hide / unload: flush immediately so we don't lose taps.
 *
 * If the user is not authed, we skip the network entirely — local IndexedDB
 * remains the offline-first source of truth.
 */

const FLUSH_MS = 1500;
const MAX_BATCH_AGE_MS = 5000;

let pendingDelta = 0;
let firstQueuedAt = 0;
let timer: number | null = null;
let inFlight = false;

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

async function flush(): Promise<void> {
  clearTimer();
  if (pendingDelta <= 0 || inFlight) return;

  const userId = authStore.getState().user?.id;
  if (!userId) {
    // Not signed in — drop pending; local IDB already has the data.
    pendingDelta = 0;
    firstQueuedAt = 0;
    return;
  }

  const delta = pendingDelta;
  pendingDelta = 0;
  firstQueuedAt = 0;
  inFlight = true;

  try {
    await incrementUserChant(delta);
  } catch (err) {
    pendingDelta += delta;
    if (!firstQueuedAt) firstQueuedAt = Date.now();
    console.warn("[userChantsSync] flush failed, will retry", err);
  } finally {
    inFlight = false;
  }
}

/** Queue one chant for cloud sync. Cheap & non-blocking. */
export function recordChantForUser(): void {
  const userId = authStore.getState().user?.id;
  if (!userId) return; // solo offline mode

  pendingDelta += 1;
  if (!firstQueuedAt) firstQueuedAt = Date.now();

  if (Date.now() - firstQueuedAt >= MAX_BATCH_AGE_MS) {
    void flush();
    return;
  }

  clearTimer();
  timer = window.setTimeout(flush, FLUSH_MS);
}

/** Pull cloud history & merge into local store on login. */
export async function pullUserHistory(): Promise<void> {
  const userId = authStore.getState().user?.id;
  if (!userId) return;
  try {
    const cloud = await fetchMyHistory();
    if (Object.keys(cloud).length > 0) {
      counterStore.mergeRemoteHistory(cloud);
    }
  } catch (err) {
    console.warn("[userChantsSync] pull failed", err);
  }
}

/** Wire window-level flush triggers exactly once. */
let installed = false;
export function installUserChantsSyncLifecycle(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const flushNow = () => { void flush(); };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("pagehide", flushNow);
  window.addEventListener("beforeunload", flushNow);
}
