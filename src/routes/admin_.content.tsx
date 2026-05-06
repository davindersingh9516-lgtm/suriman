import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Edit3, EyeOff, Eye, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { useIsAdmin } from "@/store/admin";
import {
  listAllContent,
  type ContentItem,
  type ContentType,
} from "@/services/supabase/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/content")({
  head: () => ({ meta: [{ title: "Manage Content — Admin" }] }),
  component: AdminContent,
});

const TABS: { type: ContentType; label: string; hindi: string }[] = [
  { type: "mantra", label: "Mantras", hindi: "मंत्र" },
  { type: "chalisa", label: "Chalisas", hindi: "चालीसा" },
  { type: "aarti", label: "Aartis", hindi: "आरती" },
];

function AdminContent() {
  const navigate = useNavigate();
  const { isAdmin, ready } = useIsAdmin();
  const [type, setType] = useState<ContentType>("mantra");
  const [items, setItems] = useState<ContentItem[] | null>(null);

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/" });
  }, [ready, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    setItems(null);
    listAllContent(type).then(setItems).catch(() => setItems([]));
  }, [type, isAdmin]);

  if (!ready) {
    return (
      <AppShell>
        <Container className="pt-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron" />
        </Container>
      </AppShell>
    );
  }
  if (!isAdmin) return null;

  return (
    <AppShell>
      <div className="safe-top px-3 pt-3 pb-2 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <Link
            to="/admin"
            aria-label="Back"
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="font-mantra text-lg text-maroon">Manage Content</div>
            <div className="text-xs text-muted-foreground">सामग्री प्रबंधन</div>
          </div>
          <Link
            to="/admin/content/new"
            search={{ type }}
            aria-label="Add new"
            className="h-12 w-12 rounded-2xl bg-saffron text-primary-foreground flex items-center justify-center shadow-elevated active:scale-95 transition"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      </div>

      <Container className="pt-4 pb-8 space-y-4">
        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card border border-border/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.type}
              onClick={() => setType(t.type)}
              className={cn(
                "py-3 rounded-xl text-sm font-semibold transition",
                type === t.type ? "bg-saffron text-primary-foreground" : "text-foreground/70",
              )}
            >
              <div className="font-mantra text-base">{t.hindi}</div>
              <div className="text-[11px]">{t.label}</div>
            </button>
          ))}
        </div>

        {items === null ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-saffron" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-mantra text-3xl text-saffron/50 mb-2">ॐ</p>
            <p className="text-sm text-muted-foreground">No items yet. Tap + to add.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to="/admin/content/$id"
                  params={{ id: item.id }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 shadow-soft active:scale-[0.99] transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mantra text-base text-maroon truncate">{item.title_hi}</div>
                    <div className="text-xs text-foreground/70 truncate">{item.title_en}</div>
                    {item.deity && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-saffron font-semibold">
                        {item.deity}
                      </div>
                    )}
                  </div>
                  {item.is_published ? (
                    <Eye className="h-5 w-5 text-green-600" />
                  ) : (
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Edit3 className="h-5 w-5 text-saffron" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </AppShell>
  );
}
