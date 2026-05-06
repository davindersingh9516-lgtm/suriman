import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Input } from "@/components/sumiran/Input";
import { joinGroupByCode } from "@/services/supabase/mandali";
import { mandaliStore } from "@/store/mandali";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mandali_/join")({
  head: () => ({
    meta: [
      { title: "Join Mandali — Sumiran" },
      { name: "description", content: "Enter a 6-digit code to join an existing Mandali." },
    ],
  }),
  component: JoinMandaliScreen,
});

function JoinMandaliScreen() {
  const navigate = useNavigate();
  const authReady = useAuth((s) => s.ready);
  const userId = useAuth((s) => s.user?.id ?? null);

  const [code, setCode] = useState("");
  const [yourName, setYourName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!authReady || userId || redirectedRef.current) return;
    redirectedRef.current = true;
    navigate({ to: "/auth", search: { redirect: "/mandali/join" } as never, replace: true });
  }, [authReady, userId, navigate]);

  const canSubmit = code.length === 6 && yourName.trim().length >= 2 && !submitting;

  const onJoin = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const group = await joinGroupByCode(code, yourName);
      await mandaliStore.setCurrent(group);
      navigate({ to: "/mandali" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join Mandali.");
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Header title="Join Mandali" subtitle="Enter your 6-digit invite code" />
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
          <label htmlFor="mandali-code" className="text-sm font-semibold text-foreground">
            Invite Code
          </label>
          <input
            id="mandali-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="123456"
            className={cn(
              "w-full h-20 rounded-2xl bg-card border-2 border-border text-center",
              "font-counter text-4xl tracking-[0.6em] text-maroon",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-saffron",
            )}
          />
          <p className="text-xs text-muted-foreground text-center">
            Ask the Mandali creator for the 6-digit code.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={onJoin}
          disabled={!canSubmit}
          className={cn(
            "w-full h-14 rounded-2xl font-semibold text-base shadow-elevated transition flex items-center justify-center gap-2",
            canSubmit
              ? "bg-saffron text-primary-foreground active:scale-[0.99]"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
          Join Mandali
        </button>
      </Container>
    </AppShell>
  )
}
