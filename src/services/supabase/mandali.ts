import { supabase } from "@/integrations/supabase/client";

/**
 * Mandali data layer — all DB calls live here.
 * UI never touches Supabase directly.
 */

export interface DbGroup {
  id: string;
  name: string;
  code: string;
  goal_malas: number;
  created_by: string;
  created_at: string;
}

export interface DbMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface DbChant {
  id: string;
  group_id: string;
  user_id: string;
  date: string;
  count: number;
}

function gen6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function todayUtcDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ensure profile exists & display_name is set. Idempotent. */
export async function upsertProfile(displayName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("profiles")
    .upsert(
      { id: user.id, display_name: displayName, phone: user.phone ?? null },
      { onConflict: "id" },
    );
}

/** Try inserting a group with a fresh code; retry on the rare collision. */
export async function createGroup(name: string, displayName: string): Promise<DbGroup> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  await upsertProfile(displayName);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = gen6();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: name.trim(), code, created_by: user.id })
      .select()
      .single();

    if (!error && data) {
      // Add creator as member
      const { error: memErr } = await supabase
        .from("group_members")
        .insert({ group_id: data.id, user_id: user.id, display_name: displayName });
      if (memErr) throw new Error("Could not add you to the Mandali. Please try again.");
      return data as DbGroup;
    }
    if (error && error.code !== "23505") {
      throw new Error("Could not create Mandali. Please try again.");
    }
    // 23505 = unique violation on code → retry
  }
  throw new Error("Could not generate a unique code. Please try again.");
}

export async function joinGroupByCode(code: string, displayName: string): Promise<DbGroup> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  await upsertProfile(displayName);

  const cleanCode = code.replace(/\D/g, "");
  if (cleanCode.length !== 6) throw new Error("Code must be 6 digits.");

  const { data: group, error: gErr } = await supabase
    .from("groups")
    .select()
    .eq("code", cleanCode)
    .maybeSingle();

  if (gErr) throw new Error("Could not look up that code. Please try again.");
  if (!group) throw new Error("No Mandali found with that code.");

  // Insert membership; if already member, ignore the duplicate-key error
  const { error: memErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, display_name: displayName });

  if (memErr && memErr.code !== "23505") {
    throw new Error("Could not join Mandali. Please try again.");
  }

  return group as DbGroup;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
}

export async function fetchMyCurrentGroup(): Promise<DbGroup | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Most-recent membership wins (user can be in multiple, we surface latest)
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, joined_at, groups(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data.groups as unknown as DbGroup) ?? null;
}

export async function fetchMembers(groupId: string): Promise<DbMember[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as DbMember[];
}

export async function fetchTodaysChants(groupId: string): Promise<DbChant[]> {
  const { data, error } = await supabase
    .from("chants")
    .select("*")
    .eq("group_id", groupId)
    .eq("date", todayUtcDateStr());
  if (error) return [];
  return (data ?? []) as DbChant[];
}

/** Atomic increment via SQL function — race-safe for rapid taps. */
export async function incrementChantCount(groupId: string, delta: number): Promise<void> {
  if (delta < 1) return;
  const { error } = await supabase.rpc("increment_chant_count", {
    _group_id: groupId,
    _delta: delta,
  });
  if (error) throw error;
}
