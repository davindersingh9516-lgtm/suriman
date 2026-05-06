import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, BookOpen, Search, Flame, Flower2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Card } from "@/components/sumiran/Card";
import { type ChalisaText } from "@/services/chalisas";
import { listContent } from "@/services/supabase/content";
import { cn } from "@/lib/utils";

type Category = "Chalisa" | "Aarti";

export const Route = createFileRoute("/chalisa")({
  head: () => ({
    meta: [
      { title: "Chalisa & Aarti — Sumiran" },
      { name: "description", content: "Read sacred Chalisas and Aartis offline." },
    ],
  }),
  component: ChalisaScreen,
});

function ChalisaScreen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<ChalisaText[]>([]);

  // Pull both chalisa + aarti from DB; merge with hardcoded fallback.
  useEffect(() => {
    Promise.all([listContent("chalisa"), listContent("aarti")])
      .then(([cs, as]) => {
        const toRow = (cat: "Chalisa" | "Aarti") =>
          (rows: typeof cs): ChalisaText[] =>
            rows.map((r) => ({
              id: r.slug,
              title: r.title_en,
              titleHi: r.title_hi,
              category: cat,
              deity: r.deity ?? "",
              verses: (r.body_hi ?? "")
                .split(/\n{2,}/)
                .map((v) => v.trim())
                .filter(Boolean),
            }));
        setRemote([...toRow("Chalisa")(cs), ...toRow("Aarti")(as)]);
      })
      .catch(() => setRemote([]));
  }, []);

  const allTexts = useMemo(() => remote, [remote]);

  const open = openId ? allTexts.find((c) => c.id === openId) ?? null : null;

  const counts = useMemo(
    () => ({
      Chalisa: allTexts.filter((c) => c.category === "Chalisa").length,
      Aarti: allTexts.filter((c) => c.category === "Aarti").length,
    }),
    [allTexts],
  );

  const items = useMemo(() => {
    if (!category) return [];
    const q = query.trim().toLowerCase();
    return allTexts.filter((c) => c.category === category).filter((c) => {
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.titleHi.includes(q) ||
        c.deity.toLowerCase().includes(q)
      );
    });
  }, [category, query, allTexts]);

  if (open) return <Reader chalisa={open} onBack={() => setOpenId(null)} />;

  // Tile selector
  if (!category) {
    return (
      <AppShell>
        <Header title="Chalisa & Aarti" subtitle="चालीसा एवं आरती संग्रह" />
        <Container className="space-y-4">
          <p className="text-sm text-muted-foreground px-1">
            Choose a category · श्रेणी चुनें
          </p>
          <div className="grid grid-cols-2 gap-4">
            <CategoryTile
              label="Chalisa"
              labelHi="चालीसा"
              count={counts.Chalisa}
              icon={<Flame className="h-7 w-7" />}
              onClick={() => setCategory("Chalisa")}
            />
            <CategoryTile
              label="Aarti"
              labelHi="आरती"
              count={counts.Aarti}
              icon={<Flower2 className="h-7 w-7" />}
              onClick={() => setCategory("Aarti")}
            />
          </div>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Sub-header with back to tiles */}
      <div className="safe-top px-3 pt-3 pb-2 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <button
            onClick={() => {
              setCategory(null);
              setQuery("");
            }}
            aria-label="Back to categories"
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-mantra text-lg text-maroon truncate">
              {category === "Chalisa" ? "चालीसा" : "आरती संग्रह"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {category === "Chalisa" ? "Chalisas" : "Aarti Sangrah"} · {items.length}
            </div>
          </div>
        </div>
      </div>

      <Container className="space-y-5 pt-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder={`Search ${category}…`}
            aria-label={`Search ${category}`}
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card border border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="font-mantra text-3xl text-saffron/60 mb-2">ॐ</div>
            <p className="text-sm text-muted-foreground">No texts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <BookCard key={c.id} item={c} onOpen={() => setOpenId(c.id)} />
            ))}
          </div>
        )}
      </Container>
    </AppShell>
  );
}

function CategoryTile({
  label,
  labelHi,
  count,
  icon,
  onClick,
}: {
  label: string;
  labelHi: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left active:scale-[0.98] transition-transform"
      aria-label={`Open ${label}`}
    >
      <Card className="aspect-square flex flex-col justify-between p-5">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center text-saffron"
          style={{ background: "color-mix(in oklab, var(--color-saffron) 14%, transparent)" }}
        >
          {icon}
        </div>
        <div>
          <div className="font-mantra text-2xl text-maroon leading-tight">{labelHi}</div>
          <div className="text-sm text-foreground/80 mt-0.5">{label}</div>
          <div className="mt-2 text-[11px] uppercase tracking-widest text-saffron font-semibold">
            {count} {count === 1 ? "text" : "texts"}
          </div>
        </div>
      </Card>
    </button>
  );
}

function BookCard({ item, onOpen }: { item: ChalisaText; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left active:scale-[0.99] transition-transform"
    >
      <Card className="flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 text-saffron"
          style={{ background: "color-mix(in oklab, var(--color-saffron) 12%, transparent)" }}
        >
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mantra text-lg text-maroon truncate">{item.titleHi}</div>
          <div className="text-sm text-foreground/80 truncate">{item.title}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-widest text-saffron font-semibold">
            {item.deity}
          </div>
        </div>
        <span className="text-muted-foreground text-xl pr-1" aria-hidden>›</span>
      </Card>
    </button>
  );
}

function Reader({ chalisa, onBack }: { chalisa: ChalisaText; onBack: () => void }) {
  return (
    <AppShell>
      {/* Reader header */}
      <div className="safe-top px-3 pt-3 pb-2 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <button
            onClick={onBack}
            aria-label="Back"
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-mantra text-lg text-maroon truncate">{chalisa.titleHi}</div>
            <div className="text-xs text-muted-foreground truncate">{chalisa.title} · {chalisa.deity}</div>
          </div>
        </div>
      </div>

      <Container className="pt-5 pb-6">
        <article
          className={cn(
            "rounded-3xl p-6 border border-border/60 shadow-soft",
            "bg-cream-deep/60",
          )}
        >
          <div className="text-center mb-6">
            <div className="font-mantra text-saffron text-2xl">॥ श्री {chalisa.deity === "Hanuman" ? "हनुमान" : chalisa.deity === "Durga" ? "दुर्गा" : ""} ॥</div>
          </div>
          <div className="space-y-7">
            {chalisa.verses.map((v, i) => (
              <div key={i} className="text-center">
                <p className="font-mantra text-[1.35rem] leading-loose text-foreground whitespace-pre-line">
                  {v}
                </p>
                <div className="mt-2 text-[11px] tracking-widest text-muted-foreground">
                  ॥ {i + 1} ॥
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center font-mantra text-saffron text-2xl">॥ ॐ शान्तिः ॥</div>
        </article>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Abridged for daily reading · पाठ
        </p>
      </Container>
    </AppShell>
  );
}
