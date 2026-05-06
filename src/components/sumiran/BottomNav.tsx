import { Link } from "@tanstack/react-router";
import { Home, Hand, BookOpen, ScrollText, Users, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/jaap", label: "Jaap", Icon: Hand },
  { to: "/mantra", label: "Mantra", Icon: BookOpen },
  { to: "/chalisa", label: "Chalisa", Icon: ScrollText },
  { to: "/mandali", label: "Mandali", Icon: Users },
  { to: "/progress", label: "Progress", Icon: BarChart3 },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-card/95 backdrop-blur border-t border-border safe-bottom",
      )}
    >
      <ul className="mx-auto grid max-w-md grid-cols-7">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex h-20 flex-col items-center justify-center gap-1 text-muted-foreground data-[status=active]:text-saffron"
            >
              <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              <span className="text-[12px] font-semibold leading-none">{label}</span>
              <span
                aria-hidden
                className="hidden h-1 w-5 rounded-full bg-saffron group-data-[status=active]:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
