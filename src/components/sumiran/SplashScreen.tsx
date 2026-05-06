import { useEffect, useState } from "react";
import logo from "@/assets/sumiran-logo.png";

const VISIBLE_MS = 4000;
const FADE_MS = 500;
const SEEN_KEY = "sumiran:splash-seen";

/**
 * Premium spiritual splash screen.
 * Shows ONCE per browser session (sessionStorage flag) so it doesn't
 * re-appear on every navigation, OAuth callback, or magic-link redirect.
 */
export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"visible" | "leaving" | "done">("visible");
  const [shouldShow, setShouldShow] = useState(false);

  // Only render after client mount — guarantees effects run and timers fire.
  useEffect(() => {
    setMounted(true);
    try {
      const seen = sessionStorage.getItem(SEEN_KEY);
      if (!seen) {
        setShouldShow(true);
        sessionStorage.setItem(SEEN_KEY, "1");
      }
    } catch {
      // sessionStorage unavailable (private mode) — show once anyway.
      setShouldShow(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !shouldShow) return;
    const t1 = window.setTimeout(() => setPhase("leaving"), VISIBLE_MS);
    const t2 = window.setTimeout(() => setPhase("done"), VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [mounted, shouldShow]);

  if (!mounted || !shouldShow || phase === "done") return null;


  return (
    <div
      role="status"
      aria-label="Sumiran is loading"
      className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center safe-x safe-top safe-bottom"
      style={{
        background:
          "radial-gradient(circle at 50% 35%, color-mix(in oklab, var(--saffron) 18%, var(--cream)), var(--cream-deep) 75%)",
        animation:
          phase === "leaving"
            ? `sumiran-splash-out ${FADE_MS}ms ease-out forwards`
            : undefined,
      }}
    >
      <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--saffron) 35%, transparent), transparent 65%)",
            animation: "sumiran-splash-glow 2.4s ease-in-out infinite",
          }}
        />
        <img
          src={logo}
          alt="Sumiran logo"
          width={288}
          height={288}
          className="relative h-full w-full object-contain drop-shadow-[0_8px_24px_rgba(255,107,0,0.25)]"
          style={{
            animation: "sumiran-splash-logo 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
          }}
        />
      </div>

      <div
        className="mt-10 flex flex-col items-center gap-2"
        style={{ animation: "sumiran-splash-text 700ms ease-out 250ms both" }}
      >
        <h1
          className="text-6xl font-semibold tracking-wide text-maroon sm:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          सुमिरन
        </h1>
        <p className="text-base uppercase tracking-[0.32em] text-maroon/70">Sumiran</p>
      </div>

      <p
        className="absolute bottom-12 text-sm uppercase tracking-[0.28em] text-maroon/60"
        style={{ animation: "sumiran-splash-text 700ms ease-out 500ms both" }}
      >
        Mantra · Mala · Mindfulness
      </p>
    </div>
  );
}
