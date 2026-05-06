import { supabase } from "@/integrations/supabase/client";

/**
 * Modular auth layer — wraps Supabase phone + email OTP.
 *
 * Rate limiting:
 *  - Hard local cooldown of RESEND_COOLDOWN_SECONDS between OTP requests
 *    (per device, per channel — survives reloads via localStorage).
 *  - Server-side rate limits are enforced by Supabase Auth itself.
 */

export const RESEND_COOLDOWN_SECONDS = 45;
const COOLDOWN_KEY_PREFIX = "sumiran:otp:lastSentAt:";

export type AuthChannel = "phone" | "email";

export interface SendOtpResult {
  ok: true;
  cooldownEndsAt: number;
}

export interface AuthFailure {
  ok: false;
  message: string;
}

export type AuthResult<T> = T | AuthFailure;

export function normalizePhone(raw: string, defaultCountry = "+91"): string {
  const trimmed = raw.replace(/\s|-/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  return defaultCountry + trimmed.replace(/^0+/, "");
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(normalizeEmail(raw));
}

export function getResendCooldownRemaining(channel: AuthChannel = "phone"): number {
  if (typeof window === "undefined") return 0;
  const last = Number(window.localStorage.getItem(COOLDOWN_KEY_PREFIX + channel) ?? 0);
  if (!last) return 0;
  const elapsed = (Date.now() - last) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
}

function setLastSent(channel: AuthChannel) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOLDOWN_KEY_PREFIX + channel, String(Date.now()));
}

function friendlyError(msg: string | undefined, channel: AuthChannel): string {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("rate") || m.includes("too many"))
    return "Too many requests. Please wait a moment and try again.";
  if (channel === "phone" && m.includes("invalid") && m.includes("phone"))
    return "That phone number doesn't look right. Please check and try again.";
  if (channel === "email" && m.includes("invalid") && m.includes("email"))
    return "That email doesn't look right. Please check and try again.";
  if (m.includes("token") || m.includes("otp") || m.includes("expired") || m.includes("invalid"))
    return "Incorrect or expired code. Please try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network problem. Please check your connection.";
  return "Something went wrong. Please try again.";
}

/* ---------------- Phone OTP ---------------- */

export async function sendPhoneOtp(phone: string): Promise<AuthResult<SendOtpResult>> {
  const remaining = getResendCooldownRemaining("phone");
  if (remaining > 0) {
    return { ok: false, message: `Please wait ${remaining}s before requesting a new code.` };
  }

  const e164 = normalizePhone(phone);
  if (!/^\+\d{8,15}$/.test(e164)) {
    return { ok: false, message: "That phone number doesn't look right." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: { channel: "sms" },
  });
  if (error) return { ok: false, message: friendlyError(error.message, "phone") };

  setLastSent("phone");
  return { ok: true, cooldownEndsAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000 };
}

export async function verifyPhoneOtp(
  phone: string,
  code: string,
): Promise<AuthResult<{ ok: true; userId: string }>> {
  const e164 = normalizePhone(phone);
  const cleanCode = code.replace(/\D/g, "");

  if (cleanCode.length < 6 || cleanCode.length > 8) {
    return { ok: false, message: "Please enter the verification code." };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token: cleanCode,
    type: "sms",
  });

  if (error || !data.user) return { ok: false, message: friendlyError(error?.message, "phone") };
  return { ok: true, userId: data.user.id };
}

/* ---------------- Email OTP ---------------- */

export async function sendEmailOtp(email: string): Promise<AuthResult<SendOtpResult>> {
  const remaining = getResendCooldownRemaining("email");
  if (remaining > 0) {
    return { ok: false, message: `Please wait ${remaining}s before requesting a new code.` };
  }

  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail)) {
    return { ok: false, message: "That email doesn't look right." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, message: friendlyError(error.message, "email") };

  setLastSent("email");
  return { ok: true, cooldownEndsAt: Date.now() + RESEND_COOLDOWN_SECONDS * 1000 };
}

export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<AuthResult<{ ok: true; userId: string }>> {
  const cleanEmail = normalizeEmail(email);
  const cleanCode = code.replace(/\D/g, "");

  if (cleanCode.length < 6 || cleanCode.length > 8) {
    return { ok: false, message: "Please enter the verification code." };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanCode,
    type: "email",
  });

  if (error || !data.user) return { ok: false, message: friendlyError(error?.message, "email") };
  return { ok: true, userId: data.user.id };
}

/* ---------------- Sign out ---------------- */

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
