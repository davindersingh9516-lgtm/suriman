import { useMemo } from "react";

interface BeadRingProps {
  size?: number;
  beads?: number;
  filled?: number;        // beads currently lit (0..beads)
  duration?: number;      // seconds per full rotation
  spin?: boolean;
}

/**
 * Mala bead ring — slow rotating dots circling the counter.
 * Every 9th bead (sumeru) is slightly larger for organic mala feel.
 */
export function BeadRing({
  size = 320,
  beads = 36,
  filled = 0,
  duration = 90,
  spin = true,
}: BeadRingProps) {
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  const dots = useMemo(
    () =>
      Array.from({ length: beads }).map((_, i) => {
        const angle = (i / beads) * Math.PI * 2 - Math.PI / 2; // start at top
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        const isSumeru = i % 9 === 0;
        return { x, y, r: isSumeru ? 4.5 : 2.6, i, isSumeru };
      }),
    [beads, radius, cx, cy],
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      style={{
        animation: spin ? `sumiran-spin ${duration}s linear infinite` : undefined,
        transformOrigin: "center",
        willChange: "transform",
      }}
      aria-hidden
    >
      {dots.map(({ x, y, r, i, isSumeru }) => {
        const lit = i < filled;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill={lit ? "var(--color-saffron)" : isSumeru ? "var(--color-maroon)" : "var(--color-gold)"}
            opacity={lit ? 0.95 : isSumeru ? 0.55 : 0.4}
          />
        );
      })}
    </svg>
  );
}
