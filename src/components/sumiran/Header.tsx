import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import logo from "@/assets/sumiran-logo.png";

interface HeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function Header({ title, subtitle, className }: HeaderProps) {
  return (
    <header className={cn("safe-top px-5 pt-4 pb-3 flex flex-col items-center text-center", className)}>
      <Link to="/" aria-label="Sumiran home" className="mb-2 inline-block">
        <img
          src={logo}
          alt="Sumiran"
          style={{ width: "100px", height: "100px" }}
          className="object-contain drop-shadow-[0_2px_8px_rgba(255,107,0,0.25)]"
        />
      </Link>
      <div className="flex items-baseline justify-center gap-2">
        <h1 className="text-2xl font-semibold text-maroon tracking-tight">{title}</h1>
        <span className="font-mantra text-xl text-saffron-deep" aria-hidden>
          ॐ
        </span>
      </div>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
