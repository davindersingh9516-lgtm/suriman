import { incrementChantCount } from "@/services/supabase/mandali";
import { mandaliStore } from "@/store/mandali";
import { authStore } from "@/store/auth";

/**
 * Counter → Mandali sync.
 *
 * Performance contract:
 *  - Solo users (no group): zero network calls. The counter stays 100% offline.
 *  - In a Mandali: every tap increments a local pending delta. Every FLUSH_MS
 *    (or on page hide) we flush the accumulated delta in ONE upsert RPC.
 *  - Network failure: the pending delta is kept and will retry on the next tap.
 */

const FLUSH_MS = 1500;
const MAX_BATCH_AGE_MS = 5000; // upper bound — never hold a delta longer than this

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

  const groupId = mandaliStore.getActiveGroupId();
  if (!groupId) {
    // No active group anymore; drop pending (solo flow doesn't need backend)
    pendingDelta = 0;
    firstQueuedAt = 0;
    return;
  }

  const delta = pendingDelta;
  pendingDelta = 0;
  firstQueuedAt = 0;
  inFlight = true;

  try {
    await incrementChantCount(groupId, delta);
    // Realtime will refresh chantsToday for everyone, including us.
  } catch (err) {
    // Re-queue and let the next tap or interval try again.
    pendingDelta += delta;
    if (!firstQueuedAt) firstQueuedAt = Date.now();
    console.warn("[groupSync] flush failed, will retry", err);
  } finally {
    inFlight = false;
  }
}

/** Call from counterStore.tap() when in a Mandali. Cheap & non-blocking. */
export function recordChantForGroup(): void {
  const groupId = mandaliStore.getActiveGroupId();
  const userId = authStore.getState().user?.id;
  if (!groupId || !userId) return;

  // Optimistic UI: bump the local snapshot immediately so the user sees +1
  // even before the realtime echo arrives.
  mandaliStore.bumpLocalChant(userId, 1);

  pendingDelta += 1;
  if (!firstQueuedAt) firstQueuedAt = Date.now();

  // Force-flush if we've been holding a delta too long
  if (Date.now() - firstQueuedAt >= MAX_BATCH_AGE_MS) {
    void flush();
    return;
  }

  clearTimer();
  timer = window.setTimeout(flush, FLUSH_MS);
}

/** Wire up window-level flush triggers exactly once. */
let installed = false;
export function installGroupSyncLifecycle(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const flushNow = () => { void flush(); };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  window.addEventListener("pagehide", flushNow);
  window.addEventListener("beforeunload", flushNow);
}
