-- Per-user daily chant history (works for solo users; Mandali chants are still in `chants` table).
-- Each row = one user's total chant count for one day.
CREATE TABLE IF NOT EXISTS public.user_chants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  count       integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_chants_user_date ON public.user_chants (user_id, date DESC);

ALTER TABLE public.user_chants ENABLE ROW LEVEL SECURITY;

-- Each user can only see/manage their own rows
CREATE POLICY "Users can view their own chants"
  ON public.user_chants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chants"
  ON public.user_chants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chants"
  ON public.user_chants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reuse the existing touch_updated_at() trigger
DROP TRIGGER IF EXISTS trg_user_chants_updated_at ON public.user_chants;
CREATE TRIGGER trg_user_chants_updated_at
  BEFORE UPDATE ON public.user_chants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Atomic increment for solo users (race-safe for rapid taps)
CREATE OR REPLACE FUNCTION public.increment_user_chant(_delta integer)
RETURNS public.user_chants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _today   date := (now() AT TIME ZONE 'UTC')::date;
  _row     public.user_chants;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _delta < 1 OR _delta > 10000 THEN
    RAISE EXCEPTION 'invalid delta';
  END IF;

  INSERT INTO public.user_chants (user_id, date, count)
  VALUES (_user_id, _today, _delta)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = public.user_chants.count + EXCLUDED.count,
                updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_user_chant(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_chant(integer) TO authenticated;