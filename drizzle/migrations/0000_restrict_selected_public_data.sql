DROP POLICY IF EXISTS "Authenticated users can view comfort ratings" ON public.comfort_ratings;
CREATE POLICY "Users can view their own ratings"
ON public.comfort_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
ON public.comfort_ratings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Facilities are publicly viewable" ON public.cultural_facilities;
CREATE POLICY "Signed-in users can view facilities"
ON public.cultural_facilities
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.cultural_facilities FROM anon;

DROP POLICY IF EXISTS "Districts are publicly viewable" ON public.valencia_districts;
CREATE POLICY "Admins can view districts"
ON public.valencia_districts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.valencia_districts FROM anon;