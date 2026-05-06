CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS TABLE (
  total_users BIGINT,
  total_groups BIGINT,
  chants_today BIGINT,
  chants_all_time BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM public.profiles),
    (SELECT COUNT(*)::BIGINT FROM public.groups),
    (SELECT COALESCE(SUM(count), 0)::BIGINT FROM public.user_chants
       WHERE date = (now() AT TIME ZONE 'UTC')::date),
    (SELECT COALESCE(SUM(count), 0)::BIGINT FROM public.user_chants);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;