
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_chant_count(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_chant_count(uuid, integer) TO authenticated;
