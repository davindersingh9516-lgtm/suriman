grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.increment_chant_count(uuid, integer) to authenticated;
grant execute on function public.increment_user_chant(integer) to authenticated;
grant execute on function public.get_admin_analytics() to authenticated;

alter default privileges in schema public grant execute on functions to authenticated;
