import { supabase } from "@/integrations/supabase/client";

export type ContentType = "mantra" | "chalisa" | "aarti";

export interface ContentItem {
  id: string;
  type: ContentType;
  slug: string;
  title_hi: string;
  title_en: string;
  deity: string | null;
  body_hi: string | null;
  body_en: string | null;
  meaning: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type ContentDraft = Omit<ContentItem, "id" | "created_at" | "updated_at">;

/** Public read — RLS only returns published items for non-admins. */
export async function listContent(type: ContentType): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("type", type)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

/** Admin: include unpublished too. */
export async function listAllContent(type: ContentType): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("type", type)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

export async function getContent(id: string): Promise<ContentItem | null> {
  const { data, error } = await supabase.from("content_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ContentItem) ?? null;
}

export async function createContent(draft: ContentDraft): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("content_items")
    .insert({ ...draft, created_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as ContentItem;
}

export async function updateContent(id: string, patch: Partial<ContentDraft>): Promise<void> {
  const { error } = await supabase.from("content_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw error;
}

/** Total chants summed across all users — admin only (RPC self-checks role). */
export async function getAnalyticsSummary(): Promise<{
  totalUsers: number;
  totalGroups: number;
  chantsToday: number;
  chantsAllTime: number;
}> {
  const { data, error } = await supabase.rpc("get_admin_analytics");
  if (error) throw error;
  const row = (data as Array<{
    total_users: number;
    total_groups: number;
    chants_today: number;
    chants_all_time: number;
  }>)?.[0];
  return {
    totalUsers: Number(row?.total_users ?? 0),
    totalGroups: Number(row?.total_groups ?? 0),
    chantsToday: Number(row?.chants_today ?? 0),
    chantsAllTime: Number(row?.chants_all_time ?? 0),
  };
}
