import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors",
        "min-h-0", // override global 48px for the visual track; tap area handled by parent row
        checked ? "bg-saffron" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 transform rounded-full bg-card shadow-soft transition-transform",
          checked ? "translate-x-7" : "translate-x-1",
        )}
      />
    </button>
  );
}
