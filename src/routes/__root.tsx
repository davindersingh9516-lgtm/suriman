import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { hydrate, checkDailyReset } from "@/store/counter";
import { SplashScreen } from "@/components/sumiran/SplashScreen";
import { Toaster } from "@/components/ui/sonner";
import { initAuth, useAuth } from "@/store/auth";
import { mandaliStore } from "@/store/mandali";
import { installGroupSyncLifecycle } from "@/services/groupSync";
import { installUserChantsSyncLifecycle, pullUserHistory } from "@/services/userChantsSync";
import { pullUserSettings, flushSettingsPushNow } from "@/services/settingsSync";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FF6B00" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Sumiran" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "Sumiran — सुमिरन | Mantra & Spiritual Habit" },
      { name: "description", content: "Sumiran — a calm, offline-first mantra counter and spiritual habit companion." },
      { name: "author", content: "Sumiran" },
      { property: "og:title", content: "Sumiran — सुमिरन | Mantra & Spiritual Habit" },
      { property: "og:description", content: "Sumiran — a calm, offline-first mantra counter and spiritual habit companion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Sumiran — सुमिरन | Mantra & Spiritual Habit" },
      { name: "twitter:description", content: "Sumiran — a calm, offline-first mantra counter and spiritual habit companion." },
      { property: "og:image", content: "/icons/icon-512.png" },
      { name: "twitter:image", content: "/icons/icon-512.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/icons/icon.svg" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Tiro+Devanagari+Hindi&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const userId = useAuth((s) => s.user?.id ?? null);
  const authReady = useAuth((s) => s.ready);

  useEffect(() => {
    hydrate();
    initAuth();
    installGroupSyncLifecycle();
    installUserChantsSyncLifecycle();
    const onFocus = () => checkDailyReset();
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSettingsPushNow();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushSettingsPushNow);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushSettingsPushNow);
    };
  }, []);

  // Hydrate Mandali + personal cloud history + cloud settings on user change.
  useEffect(() => {
    if (!authReady) return;
    void mandaliStore.hydrateForUser(userId);
    if (userId) {
      void pullUserHistory();
      void pullUserSettings();
    }
  }, [authReady, userId]);

  return (
    <>
      <SplashScreen />
      <Outlet />
      <Toaster position="top-center" />
    </>
  );
}
