import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Phone, Mail } from "lucide-react";
import { AppShell } from "@/components/sumiran/AppShell";
import { Container } from "@/components/sumiran/Container";
import { Header } from "@/components/sumiran/Header";
import { Input } from "@/components/sumiran/Input";
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  sendEmailOtp,
  verifyEmailOtp,
  getResendCooldownRemaining,
  type AuthChannel,
} from "@/services/supabase/auth";
import { upsertProfile } from "@/services/supabase/mandali";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Sumiran" },
      { name: "description", content: "Sign in with phone or email to join your Mandali." },
    ],
  }),
  component: AuthScreen,
});

type Step = "identifier" | "code";

function AuthScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.search as { redirect?: string })?.redirect || "/mandali";

  const [channel, setChannel] = useState<AuthChannel>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const identifier = channel === "phone" ? phone : email;
  const sentTo = channel === "phone" ? phone : email;

  // Tick down resend cooldown for the active channel
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    if (step !== "code") return;
    const tick = () => setCooldown(getResendCooldownRemaining(channel));
    tick();
    tickRef.current = window.setInterval(tick, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [step, channel]);

  const switchChannel = (next: AuthChannel) => {
    if (next === channel) return;
    setChannel(next);
    setError(null);
    setCode("");
    setStep("identifier");
  };

  const onSendCode = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    setLoading(true);
    const res =
      channel === "phone" ? await sendPhoneOtp(phone) : await sendEmailOtp(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setStep("code");
    setCooldown(getResendCooldownRemaining(channel));
  };

  const onResend = async () => {
    setError(null);
    if (cooldown > 0) return;
    setLoading(true);
    const res =
      channel === "phone" ? await sendPhoneOtp(phone) : await sendEmailOtp(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setCooldown(getResendCooldownRemaining(channel));
  };

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    const res =
      channel === "phone"
        ? await verifyPhoneOtp(phone, code)
        : await verifyEmailOtp(email, code);
    if (!res.ok) {
      setLoading(false);
      setError(res.message);
      return;
    }
    try {
      await upsertProfile(name.trim());
    } catch {
      /* non-fatal */
    }
    setLoading(false);
    navigate({ to: redirectTo as "/mandali" });
  };

  return (
    <AppShell>
      <Header
        title={step === "identifier" ? "Sign in" : "Enter code"}
        subtitle={
          step === "identifier"
            ? channel === "phone"
              ? "We'll send a one-time code to your phone"
              : "We'll send a one-time code to your email"
            : `Sent to ${sentTo}`
        }
      />
      <Container className="space-y-5">
        {step === "code" && (
          <button
            type="button"
            onClick={() => {
              setStep("identifier");
              setCode("");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-maroon"
          >
            <ArrowLeft className="h-4 w-4" />{" "}
            {channel === "phone" ? "Change number" : "Change email"}
          </button>
        )}

        {step === "identifier" ? (
          <>
            {/* Channel slide-toggle */}
            <ChannelToggle channel={channel} onChange={switchChannel} />

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-foreground">
                Your Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh"
                maxLength={40}
                className="text-lg"
              />
            </div>

            {channel === "phone" ? (
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-semibold text-foreground">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="text-lg font-counter tabular-nums"
                />
                <p className="text-xs text-muted-foreground">
                  Indian numbers: just type your 10-digit number. Standard SMS rates apply.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email Address
                </label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  We'll email you a verification code. No password needed.
                </p>
              </div>
            )}

            {error && <ErrorMsg msg={error} />}

            <PrimaryButton
              onClick={onSendCode}
              loading={loading}
              disabled={identifier.trim().length < 3}
            >
              Send Code
            </PrimaryButton>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-semibold text-foreground">
                Verification Code
              </label>
              <input
                id="otp"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="12345678"
                autoFocus
                className={cn(
                  "w-full h-20 rounded-2xl bg-card border-2 border-border text-center",
                  "font-counter text-3xl tracking-[0.4em] text-maroon",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-saffron",
                )}
              />
            </div>

            {error && <ErrorMsg msg={error} />}

            <PrimaryButton onClick={onVerify} loading={loading} disabled={code.length < 6 || code.length > 8}>
              Verify & Continue
            </PrimaryButton>

            <button
              type="button"
              onClick={onResend}
              disabled={cooldown > 0 || loading}
              className={cn(
                "w-full text-center text-sm font-medium py-2",
                cooldown > 0 ? "text-muted-foreground" : "text-saffron hover:underline",
              )}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </>
        )}
      </Container>
    </AppShell>
  );
}

/* ---------- Channel slide-toggle (Phone | Email) ---------- */

function ChannelToggle({
  channel,
  onChange,
}: {
  channel: AuthChannel;
  onChange: (c: AuthChannel) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sign-in method"
      className="relative grid grid-cols-2 h-12 rounded-2xl bg-muted p-1 border border-border/60"
    >
      {/* Sliding pill */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl bg-saffron shadow-soft transition-transform duration-300 ease-out",
          channel === "phone" ? "translate-x-0" : "translate-x-[calc(100%+0.25rem)]",
        )}
      />
      <button
        role="tab"
        aria-selected={channel === "phone"}
        onClick={() => onChange("phone")}
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
          channel === "phone" ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        <Phone className="h-4 w-4" /> Phone
      </button>
      <button
        role="tab"
        aria-selected={channel === "email"}
        onClick={() => onChange("email")}
        className={cn(
          "relative z-10 inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
          channel === "email" ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        <Mail className="h-4 w-4" /> Email
      </button>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
      {msg}
    </div>
  );
}

function PrimaryButton({
  onClick,
  loading,
  disabled,
  children,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const isDisabled = !!disabled || !!loading;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "w-full h-14 rounded-2xl font-semibold text-base shadow-elevated transition flex items-center justify-center gap-2",
        isDisabled
          ? "bg-muted text-muted-foreground cursor-not-allowed"
          : "bg-saffron text-primary-foreground active:scale-[0.99]",
      )}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}
