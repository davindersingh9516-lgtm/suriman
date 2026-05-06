-- Lock down SECURITY DEFINER functions: only authenticated users (or system) can execute.

REVOKE ALL ON FUNCTION public.is_group_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_chant_count(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_chant_count(UUID, INTEGER) TO authenticated;

-- handle_new_user runs from auth trigger context, no app-side execute needed
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- touch_updated_at runs from triggers only
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;