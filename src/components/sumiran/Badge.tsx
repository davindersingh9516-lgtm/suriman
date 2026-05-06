import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        "bg-gold-soft text-maroon border border-gold/40",
        className,
      )}
    >
      {children}
    </span>
  );
}
