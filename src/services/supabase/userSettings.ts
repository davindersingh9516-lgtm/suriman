import { supabase } from "@/integrations/supabase/client";
import type { Settings } from "@/storage/db";

export interface CloudSettingsRow {
  daily_goal: number;
  mantra: { id: string; hi: string; en: string } | null;
  haptics: boolean;
  sound: Settings["sound"];
  reminder_enabled: boolean;
  reminder_time: string;
  updated_at: string;
}

export async function fetchUserSettings(): Promise<CloudSettingsRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as CloudSettingsRow;
}

export async function upsertUserSettings(
  patch: Partial<Omit<CloudSettingsRow, "updated_at">>,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
  if (error) console.warn("[userSettings] upsert failed", error);
}
