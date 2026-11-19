DROP POLICY IF EXISTS "Signed-in users can view facilities" ON public.cultural_facilities;

CREATE OR REPLACE VIEW public.cultural_facilities_public AS
SELECT
  id,
  external_id,
  name,
  facility_type,
  description,
  address,
  district,
  neighborhood,
  latitude,
  longitude,
  website,
  schedule,
  image_url,
  has_accessibility,
  has_family_zone,
  has_lockers,
  is_quiet,
  has_climate_control,
  tags,
  source,
  created_at,
  updated_at
FROM public.cultural_facilities;

GRANT SELECT ON public.cultural_facilities_public TO anon, authenticated, service_role;