import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { type Mantra } from "@/services/mantras";
import { listContent } from "@/services/supabase/content";
import { counterStore, useCounter } from "@/store/counter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mantra")({
  head: () => ({
    meta: [
      { title: "Mantra Library — Sumiran" },
      { name: "description", content: "Choose a sacred mantra for your daily japa." },
    ],
  }),
  component: MantraScreen,
});

function MantraScreen() {
  const navigate = useNavigate();
  const currentId = useCounter((s) => s.mantra.id);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [remoteMantras, setRemoteMantras] = useState<Mantra[]>([]);

  // Merge: hardcoded (offline fallback) + DB items. DB items by slug override.
  useEffect(() => {
    listContent("mantra")
      .then((rows) => {
        setRemoteMantras(
          rows.map((r) => ({
            id: r.slug,
            hi: r.title_hi,
            en: r.title_en,
            deity: r.deity ?? "",
            meaning: r.meaning ?? "",
          })),
        );
      })
      .catch(() => setRemoteMantras([]));
  }, []);

  const allMantras = useMemo(() => remoteMantras, [remoteMantras]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allMantras;
    return allMantras.filter(
      (m) =>
        m.hi.toLowerCase().includes(q) ||
        m.en.toLowerCase().includes(q) ||
        m.deity.toLowerCase().includes(q) ||
        m.meaning.toLowerCase().includes(q),
    );
  }, [query, allMantras]);

  const selectedId = pendingId ?? currentId;
  const selectedDiffers = pendingId !== null && pendingId !== currentId;

  const startChanting = () => {
    if (pendingId) {
      const m = allMantras.find((x) => x.id === pendingId);
      if (m) counterStore.setMantra({ id: m.id, hi: m.hi, en: m.en });
    }
    navigate({ to: "/jaap" });
  };

  return (
    <AppShell>
      <Header title="Mantra" subtitle="Choose your sacred sound · पवित्र मंत्र" />

      <Container className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            inputMode="search"
            placeholder="Search mantra..."
            aria-label="Search mantras"
            className={cn(
              "w-full h-14 pl-12 pr-4 rounded-2xl bg-card border border-border text-base text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
            )}
          />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            className={cn(
              "grid grid-cols-2 gap-3",
              // extra space at bottom so sticky CTA never overlaps last cards
              selectedDiffers ? "pb-28" : "pb-4",
            )}
          >
            {filtered.map((m) => (
              <MantraCard
                key={m.id}
                mantra={m}
                selected={selectedId === m.id}
                isCurrent={currentId === m.id}
                onSelect={() => setPendingId(m.id)}
              />
            ))}
          </ul>
        )}
      </Container>

      {/* Sticky CTA appears only when a different mantra is chosen */}
      {selectedDiffers && (
        <div
          className="fixed bottom-16 left-0 right-0 z-30 safe-bottom"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <div className="mx-auto max-w-md px-5">
            <button
              onClick={startChanting}
              className={cn(
                "w-full h-14 rounded-2xl bg-saffron text-primary-foreground font-semibold text-base shadow-elevated",
                "active:scale-[0.99] transition",
              )}
              style={{ animation: "sumiran-tap 220ms ease-out" }}
            >
              Start Chanting
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MantraCard({
  mantra,
  selected,
  isCurrent,
  onSelect,
}: {
  mantra: Mantra;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "group relative w-full h-full text-left rounded-2xl p-4 bg-card border transition-all duration-200",
          "flex flex-col gap-2 min-h-[160px]",
          selected
            ? "border-saffron shadow-elevated ring-2 ring-saffron/30"
            : "border-border/60 shadow-soft hover:border-saffron/40",
        )}
      >
        {isCurrent && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-gold-soft text-maroon text-[10px] font-semibold px-2 py-0.5 border border-gold/40">
            <Check className="h-3 w-3" /> current
          </span>
        )}

        <p className="font-mantra text-xl leading-tight text-maroon line-clamp-2">
          {mantra.hi}
        </p>
        <p className="text-xs text-foreground/80 line-clamp-1">{mantra.en}</p>

        <div className="mt-auto pt-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-saffron font-semibold">
            {mantra.deity}
          </span>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {mantra.meaning}
          </p>
        </div>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 font-mantra text-3xl text-saffron/60">ॐ</div>
      <p className="text-base font-medium text-foreground">No mantra found</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a different word.</p>
    </div>
  );
}
