import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { useIsAdmin } from "@/store/admin";
import { createContent, type ContentDraft, type ContentType } from "@/services/supabase/content";
import { ContentForm } from "@/components/sumiran/ContentForm";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/content_/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    type: ((s.type as string) || "mantra") as ContentType,
  }),
  head: () => ({ meta: [{ title: "Add Content — Admin" }] }),
  component: AdminContentNew,
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `item-${Date.now()}`;
}

function AdminContentNew() {
  const navigate = useNavigate();
  const { type } = Route.useSearch();
  const { isAdmin, ready } = useIsAdmin();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/" });
  }, [ready, isAdmin, navigate]);

  if (!ready) return null;
  if (!isAdmin) return null;

  const initial: ContentDraft = {
    type,
    slug: "",
    title_hi: "",
    title_en: "",
    deity: "",
    body_hi: "",
    body_en: "",
    meaning: "",
    order_index: 0,
    is_published: true,
  };

  const onSubmit = async (draft: ContentDraft) => {
    setSaving(true);
    try {
      const finalDraft = {
        ...draft,
        slug: draft.slug.trim() || slugify(draft.title_en || draft.title_hi),
      };
      await createContent(finalDraft);
      toast.success("Saved!");
      navigate({ to: "/admin/content" });
    } catch (e) {
      toast.error((e as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="safe-top px-3 pt-3 pb-2 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-md flex items-center gap-2">
          <Link
            to="/admin/content"
            aria-label="Back"
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-foreground active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="font-mantra text-lg text-maroon">Add {type}</div>
            <div className="text-xs text-muted-foreground">नया जोड़ें</div>
          </div>
        </div>
      </div>

      <Container className="pt-4 pb-8">
        <ContentForm
          initial={initial}
          onSubmit={onSubmit}
          submitLabel={saving ? "Saving…" : "Save"}
          submitIcon={saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          disabled={saving}
        />
      </Container>
    </AppShell>
  );
}
