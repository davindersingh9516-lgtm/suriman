/**
 * Sensory feedback helpers — no external libs.
 * Vibration uses the Web Vibration API (no-op on unsupported devices).
 * Bell uses a tiny WebAudio sine ping; created lazily and cached.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function vibrate(pattern: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

/** Soft temple-bell-ish ping. */
export function bell(volume = 0.18) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(880, now);
  o.frequency.exponentialRampToValueAtTime(440, now + 1.4);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  o.connect(g).connect(c.destination);
  o.start(now);
  o.stop(now + 1.7);
}
