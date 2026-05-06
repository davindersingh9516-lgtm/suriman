import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Input } from "@/components/sumiran/Input";
import { createGroup } from "@/services/supabase/mandali";
import { mandaliStore } from "@/store/mandali";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mandali_/create")({
  head: () => ({
    meta: [
      { title: "Create Mandali — Sumiran" },
      { name: "description", content: "Create a new chanting group and invite your loved ones." },
    ],
  }),
  component: CreateMandaliScreen,
});

function CreateMandaliScreen() {
  const navigate = useNavigate();
  const authReady = useAuth((s) => s.ready);
  const userId = useAuth((s) => s.user?.id ?? null);

  const [groupName, setGroupName] = useState("");
  const [yourName, setYourName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!authReady || userId || redirectedRef.current) return;
    redirectedRef.current = true;
    navigate({ to: "/auth", search: { redirect: "/mandali/create" } as never, replace: true });
  }, [authReady, userId, navigate]);

  const canSubmit = groupName.trim().length >= 2 && yourName.trim().length >= 2 && !submitting;

  const onCreate = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const group = await createGroup(groupName, yourName);
      await mandaliStore.setCurrent(group);
      navigate({ to: "/mandali" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create Mandali.");
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Header title="Create Mandali" subtitle="Start your group sadhana" />
      <Container className="space-y-5">
        <Link
          to="/mandali"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-maroon"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="space-y-2">
          <label htmlFor="your-name" className="text-sm font-semibold text-foreground">
            Your Name
          </label>
          <Input
            id="your-name"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="e.g. Ramesh"
            maxLength={40}
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="mandali-name" className="text-sm font-semibold text-foreground">
            Mandali Name
          </label>
          <Input
            id="mandali-name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Sharma Family Satsang"
            maxLength={60}
            className="text-lg"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={onCreate}
          disabled={!canSubmit}
          className={cn(
            "w-full h-14 rounded-2xl font-semibold text-base shadow-elevated transition flex items-center justify-center gap-2",
            canSubmit
              ? "bg-saffron text-primary-foreground active:scale-[0.99]"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          Create Mandali
        </button>
      </Container>
    </AppShell>
  );
}
