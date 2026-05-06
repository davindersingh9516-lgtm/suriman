import { supabase } from "@/integrations/supabase/client";

/**
 * Admin role helpers — backed by the `user_roles` table + `has_role()` function.
 * NEVER trust client-side flags; every write is also gated by RLS on the server.
 */

export type AppRole = "admin" | "user";

/** Returns true if the currently signed-in user has the given role. */
export async function currentUserHasRole(role: AppRole): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", role)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export interface AdminUserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  is_admin: boolean;
}

/** Admin-only: list all profiles + which ones are admins. RLS will block non-admins. */
export async function listAllUsersWithRoles(): Promise<AdminUserRow[]> {
  // profiles RLS only lets users see their own row, so admin must use the
  // user_roles join to enumerate. We list user_roles + profiles separately.
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email, phone"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));

  return (profiles ?? []).map((p) => ({
    user_id: p.id,
    display_name: p.display_name,
    email: p.email,
    phone: p.phone,
    is_admin: adminIds.has(p.id),
  }));
}

export async function grantAdmin(userId: string): Promise<void> {
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
  if (error && error.code !== "23505") throw error;
}

export async function revokeAdmin(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw error;
}
