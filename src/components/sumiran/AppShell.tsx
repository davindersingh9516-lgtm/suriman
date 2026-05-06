import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  // Scroll to top on every route change so each screen starts at the top
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [pathname]);

  return (
    <div className="min-h-dvh pb-28 safe-x">
      <main className="mx-auto w-full max-w-md">{children}</main>
      <BottomNav />
    </div>
  );
}
