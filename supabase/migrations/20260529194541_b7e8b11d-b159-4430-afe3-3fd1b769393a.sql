
-- 1) Restrict comfort_ratings SELECT to authenticated users (was public, exposing user_id)
DROP POLICY IF EXISTS "Comfort ratings are publicly viewable" ON public.comfort_ratings;

CREATE POLICY "Authenticated users can view comfort ratings"
ON public.comfort_ratings
FOR SELECT
TO authenticated
USING (true);

-- 2) Revoke EXECUTE on internal trigger functions from anon/authenticated.
--    These are invoked only by triggers (handle_new_user on auth.users,
--    update_updated_at_column on row updates) and should not be callable via the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Note: public.has_role(uuid, app_role) is intentionally executable by
-- authenticated because it is referenced inside RLS policies evaluated
-- as the calling role. Keep EXECUTE for authenticated, revoke from anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
