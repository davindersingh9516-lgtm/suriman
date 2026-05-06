import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-card text-card-foreground border border-border/60 shadow-soft p-5",
        className,
      )}
      {...props}
    />
  );
}
