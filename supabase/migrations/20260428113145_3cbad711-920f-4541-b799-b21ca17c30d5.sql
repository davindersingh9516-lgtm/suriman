-- =====================================================================
-- 1. PROFILES — minimal public profile keyed to auth.users
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Devotee',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================================
-- 2. GROUPS — a Mandali
-- =====================================================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
  goal_malas INTEGER NOT NULL DEFAULT 11 CHECK (goal_malas BETWEEN 1 AND 1080),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_code ON public.groups(code);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. GROUP_MEMBERS
-- =====================================================================
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Devotee',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. CHANTS — one row per user per group per day
-- =====================================================================
CREATE TABLE public.chants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id, date)
);

CREATE INDEX idx_chants_group_date ON public.chants(group_id, date);
CREATE INDEX idx_chants_user_date ON public.chants(user_id, date);

ALTER TABLE public.chants ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- HELPER FUNCTION — security definer, avoids RLS recursion on group_members
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

-- =====================================================================
-- RLS POLICIES — groups
-- =====================================================================
-- Anyone signed in can SELECT a group (needed to look up by code when joining).
-- This is safe: the only fields exposed are name, code, goal_malas — no PII.
CREATE POLICY "Authenticated users can view groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- =====================================================================
-- RLS POLICIES — group_members
-- =====================================================================
CREATE POLICY "Members can view co-members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can add themselves to a group"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave a group"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================================
-- RLS POLICIES — chants
-- =====================================================================
CREATE POLICY "Members can view chants in their groups"
  ON public.chants FOR SELECT
  TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Users can insert their own chants in their groups"
  ON public.chants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Users can update their own chants"
  ON public.chants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================================
-- TIMESTAMP TRIGGER
-- =====================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_chants_updated_at
  BEFORE UPDATE ON public.chants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- AUTO-CREATE PROFILE on signup
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Devotee'),
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- ATOMIC CHANT INCREMENT — avoids race conditions on concurrent taps
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increment_chant_count(
  _group_id UUID,
  _delta INTEGER
)
RETURNS public.chants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _row public.chants;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _delta < 1 OR _delta > 10000 THEN
    RAISE EXCEPTION 'invalid delta';
  END IF;

  IF NOT public.is_group_member(_group_id, _user_id) THEN
    RAISE EXCEPTION 'not a member of this group';
  END IF;

  INSERT INTO public.chants (group_id, user_id, date, count)
  VALUES (_group_id, _user_id, _today, _delta)
  ON CONFLICT (group_id, user_id, date)
  DO UPDATE SET count = public.chants.count + EXCLUDED.count,
                updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

-- =====================================================================
-- REALTIME — broadcast member + chant changes
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chants;
ALTER TABLE public.chants REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;