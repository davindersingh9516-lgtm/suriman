import { supabase } from "@/integrations/supabase/client";

/**
 * Per-user daily chant history — synced to Supabase `user_chants` table.
 *
 * This is independent of Mandali (group) chants. Every signed-in user has
 * their personal history persisted to the cloud so it survives device
 * changes and reinstalls.
 *
 *  - `incrementUserChant(delta)` — atomic RPC, race-safe for rapid taps.
 *  - `fetchMyHistory()` — full history for the authed user (most recent first).
 */

export interface UserChantRow {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  count: number;
  created_at: string;
  updated_at: string;
}

export async function incrementUserChant(delta: number): Promise<void> {
  if (delta < 1) return;
  const { error } = await supabase.rpc("increment_user_chant", { _delta: delta });
  if (error) throw error;
}

export async function fetchMyHistory(): Promise<Record<string, number>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("user_chants")
    .select("date, count")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(365);

  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) out[row.date] = row.count;
  return out;
}
