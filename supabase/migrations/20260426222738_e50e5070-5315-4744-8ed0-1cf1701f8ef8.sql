-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('citizen', 'admin');
CREATE TYPE public.cultural_profile AS ENUM ('family', 'researcher', 'tourist', 'local_recurrent', 'undefined');
CREATE TYPE public.facility_type AS ENUM ('museum', 'library', 'theater', 'cultural_center', 'exhibition_hall', 'auditorium', 'archive', 'other');
CREATE TYPE public.interaction_type AS ENUM ('search', 'view', 'favorite', 'visited', 'unfavorite');
CREATE TYPE public.comfort_dimension AS ENUM ('acoustic', 'accessibility', 'staff', 'climate', 'family_friendly', 'silence');

-- ============================================
-- TIMESTAMP TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- USER ROLES (separate table — security best practice)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  cultural_profile cultural_profile NOT NULL DEFAULT 'undefined',
  interests TEXT[] NOT NULL DEFAULT '{}',
  comfort_priorities TEXT[] NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE + ROLE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_role app_role;
BEGIN
  -- Read role from raw_user_meta_data, default to citizen
  selected_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::app_role,
    'citizen'
  );

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VALENCIA DISTRICTS
-- ============================================
CREATE TABLE public.valencia_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  population INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.valencia_districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Districts are publicly viewable"
  ON public.valencia_districts FOR SELECT
  USING (true);

-- ============================================
-- CULTURAL FACILITIES
-- ============================================
CREATE TABLE public.cultural_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  facility_type facility_type NOT NULL DEFAULT 'other',
  description TEXT,
  address TEXT,
  district TEXT,
  neighborhood TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  website TEXT,
  email TEXT,
  schedule TEXT,
  image_url TEXT,
  -- Comfort flags (initial — community ratings refine over time)
  has_accessibility BOOLEAN NOT NULL DEFAULT false,
  has_family_zone BOOLEAN NOT NULL DEFAULT false,
  has_lockers BOOLEAN NOT NULL DEFAULT false,
  is_quiet BOOLEAN NOT NULL DEFAULT false,
  has_climate_control BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cultural_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilities are publicly viewable"
  ON public.cultural_facilities FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage facilities"
  ON public.cultural_facilities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_facilities_type ON public.cultural_facilities(facility_type);
CREATE INDEX idx_facilities_district ON public.cultural_facilities(district);
CREATE INDEX idx_facilities_location ON public.cultural_facilities(latitude, longitude);

CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.cultural_facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INTERACTIONS (user behaviour log)
-- ============================================
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  interaction_type interaction_type NOT NULL,
  facility_id UUID REFERENCES public.cultural_facilities(id) ON DELETE SET NULL,
  search_query TEXT,
  searched_type facility_type,
  district TEXT,
  user_profile_snapshot cultural_profile,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interactions"
  ON public.interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
  ON public.interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
  ON public.interactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interactions"
  ON public.interactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_interactions_user ON public.interactions(user_id);
CREATE INDEX idx_interactions_facility ON public.interactions(facility_id);
CREATE INDEX idx_interactions_type ON public.interactions(interaction_type);
CREATE INDEX idx_interactions_district ON public.interactions(district);
CREATE INDEX idx_interactions_created ON public.interactions(created_at);

-- ============================================
-- COMFORT RATINGS
-- ============================================
CREATE TABLE public.comfort_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.cultural_facilities(id) ON DELETE CASCADE NOT NULL,
  dimension comfort_dimension NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, facility_id, dimension)
);

ALTER TABLE public.comfort_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comfort ratings are publicly viewable"
  ON public.comfort_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own ratings"
  ON public.comfort_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.comfort_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.comfort_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_comfort_ratings_updated_at
  BEFORE UPDATE ON public.comfort_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();