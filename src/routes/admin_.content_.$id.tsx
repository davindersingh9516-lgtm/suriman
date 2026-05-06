import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Save, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { useIsAdmin } from "@/store/admin";
import {
  getContent,
  updateContent,
  deleteContent,
  type ContentDraft,
  type ContentItem,
} from "@/services/supabase/content";
import { ContentForm } from "@/components/sumiran/ContentForm";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/content_/$id")({
  head: () => ({ meta: [{ title: "Edit Content — Admin" }] }),
  component: AdminContentEdit,
});

function AdminContentEdit() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin, ready } = useIsAdmin();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && !isAdmin) navigate({ to: "/" });
  }, [ready, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    getContent(id).then((it) => {
      if (!it) {
        toast.error("Item not found");
        navigate({ to: "/admin/content" });
        return;
      }
      setItem(it);
    });
  }, [id, isAdmin, navigate]);

  if (!ready || !item) {
    return (
      <AppShell>
        <Container className="pt-20 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron" />
        </Container>
      </AppShell>
    );
  }
  if (!isAdmin) return null;

  const initial: ContentDraft = {
    type: item.type,
    slug: item.slug,
    title_hi: item.title_hi,
    title_en: item.title_en,
    deity: item.deity ?? "",
    body_hi: item.body_hi ?? "",
    body_en: item.body_en ?? "",
    meaning: item.meaning ?? "",
    order_index: item.order_index,
    is_published: item.is_published,
  };

  const onSubmit = async (draft: ContentDraft) => {
    setSaving(true);
    try {
      await updateContent(id, draft);
      toast.success("Updated!");
      navigate({ to: "/admin/content" });
    } catch (e) {
      toast.error((e as Error).message || "Could not update");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this item permanently?")) return;
    try {
      await deleteContent(id);
      toast.success("Deleted");
      navigate({ to: "/admin/content" });
    } catch (e) {
      toast.error((e as Error).message || "Could not delete");
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
            <div className="font-mantra text-lg text-maroon truncate">Edit</div>
            <div className="text-xs text-muted-foreground truncate">{item.title_en}</div>
          </div>
          <button
            onClick={onDelete}
            aria-label="Delete"
            className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center active:scale-95 transition"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Container className="pt-4 pb-8">
        <ContentForm
          initial={initial}
          onSubmit={onSubmit}
          submitLabel={saving ? "Saving…" : "Update"}
          submitIcon={saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          disabled={saving}
          lockType
        />
      </Container>
    </AppShell>
  );
}
