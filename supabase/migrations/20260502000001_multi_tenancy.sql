-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY MIGRATION
-- Adds club_id to every table, backfills with David's club, rewrites RLS to
-- scope on auth.jwt()->'app_metadata'->>'club_id'
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend clubs table ────────────────────────────────────────────────────
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS domain    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url  TEXT,
  ADD COLUMN IF NOT EXISTS status    TEXT NOT NULL DEFAULT 'active';

-- ── 2. Create super_admins table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.super_admins (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        UNIQUE NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
-- Super admins table is only accessible via service_role
CREATE POLICY "service_role_only" ON public.super_admins
  USING (auth.role() = 'service_role');

-- ── 3. Insert David's club (if not already present) ─────────────────────────
INSERT INTO public.clubs (name, slug, owner_email, domain, status)
VALUES ('2NYT Entertainment', '2nyt', 'haripritham.dev@gmail.com', '2nyt.app', 'active')
ON CONFLICT (slug) DO UPDATE SET
  domain = EXCLUDED.domain,
  status = EXCLUDED.status;

-- ── 4. Helper: get David's club UUID ─────────────────────────────────────────
DO $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT id INTO v_club_id FROM public.clubs WHERE slug = '2nyt';

  -- ── 5. Add club_id column to every tenant table ────────────────────────────

  -- attendance_log
  ALTER TABLE public.attendance_log ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.attendance_log SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.attendance_log ALTER COLUMN club_id SET NOT NULL;

  -- behaviour_notes
  ALTER TABLE public.behaviour_notes ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.behaviour_notes SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.behaviour_notes ALTER COLUMN club_id SET NOT NULL;

  -- bottle_service
  ALTER TABLE public.bottle_service ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.bottle_service SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.bottle_service ALTER COLUMN club_id SET NOT NULL;

  -- club_settings
  ALTER TABLE public.club_settings ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.club_settings SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.club_settings ALTER COLUMN club_id SET NOT NULL;

  -- customer_entries
  ALTER TABLE public.customer_entries ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.customer_entries SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.customer_entries ALTER COLUMN club_id SET NOT NULL;

  -- dance_sessions
  ALTER TABLE public.dance_sessions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.dance_sessions SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.dance_sessions ALTER COLUMN club_id SET NOT NULL;

  -- dance_tiers
  ALTER TABLE public.dance_tiers ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.dance_tiers SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.dance_tiers ALTER COLUMN club_id SET NOT NULL;

  -- dancer_ban_log
  ALTER TABLE public.dancer_ban_log ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.dancer_ban_log SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.dancer_ban_log ALTER COLUMN club_id SET NOT NULL;

  -- dancer_event_log
  ALTER TABLE public.dancer_event_log ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.dancer_event_log SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.dancer_event_log ALTER COLUMN club_id SET NOT NULL;

  -- dancer_stage_names
  ALTER TABLE public.dancer_stage_names ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.dancer_stage_names SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.dancer_stage_names ALTER COLUMN club_id SET NOT NULL;

  -- dancers
  ALTER TABLE public.dancers ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.dancers SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.dancers ALTER COLUMN club_id SET NOT NULL;

  -- distributors
  ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.distributors SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.distributors ALTER COLUMN club_id SET NOT NULL;

  -- early_leave_codes
  ALTER TABLE public.early_leave_codes ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.early_leave_codes SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.early_leave_codes ALTER COLUMN club_id SET NOT NULL;

  -- entry_tiers
  ALTER TABLE public.entry_tiers ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.entry_tiers SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.entry_tiers ALTER COLUMN club_id SET NOT NULL;

  -- guest_visits
  ALTER TABLE public.guest_visits ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.guest_visits SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.guest_visits ALTER COLUMN club_id SET NOT NULL;

  -- guests
  ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.guests SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.guests ALTER COLUMN club_id SET NOT NULL;

  -- kiosk_sessions
  ALTER TABLE public.kiosk_sessions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.kiosk_sessions SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.kiosk_sessions ALTER COLUMN club_id SET NOT NULL;

  -- payment_history
  ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.payment_history SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.payment_history ALTER COLUMN club_id SET NOT NULL;

  -- profiles
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.profiles SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.profiles ALTER COLUMN club_id SET NOT NULL;

  -- promo_codes
  ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.promo_codes SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.promo_codes ALTER COLUMN club_id SET NOT NULL;

  -- promo_redemptions
  ALTER TABLE public.promo_redemptions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.promo_redemptions SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.promo_redemptions ALTER COLUMN club_id SET NOT NULL;

  -- room_sessions
  ALTER TABLE public.room_sessions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.room_sessions SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.room_sessions ALTER COLUMN club_id SET NOT NULL;

  -- staff_attendance
  ALTER TABLE public.staff_attendance ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.staff_attendance SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.staff_attendance ALTER COLUMN club_id SET NOT NULL;

  -- stage_fines
  ALTER TABLE public.stage_fines ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.stage_fines SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.stage_fines ALTER COLUMN club_id SET NOT NULL;

  -- stage_rotation
  ALTER TABLE public.stage_rotation ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.stage_rotation SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.stage_rotation ALTER COLUMN club_id SET NOT NULL;

  -- stage_sessions
  ALTER TABLE public.stage_sessions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.stage_sessions SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.stage_sessions ALTER COLUMN club_id SET NOT NULL;

  -- transactions
  ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.transactions SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.transactions ALTER COLUMN club_id SET NOT NULL;

  -- user_roles
  ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.user_roles SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.user_roles ALTER COLUMN club_id SET NOT NULL;

  -- vendors
  ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id);
  UPDATE public.vendors SET club_id = v_club_id WHERE club_id IS NULL;
  ALTER TABLE public.vendors ALTER COLUMN club_id SET NOT NULL;

  -- ── 6. Stamp David's existing auth users with club_id in app_metadata ──────
  -- (This must be done via the Admin API after migration — not possible in SQL)

END $$;

-- ── 7. Indexes on club_id for every tenant table ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_log_club     ON public.attendance_log (club_id);
CREATE INDEX IF NOT EXISTS idx_behaviour_notes_club    ON public.behaviour_notes (club_id);
CREATE INDEX IF NOT EXISTS idx_bottle_service_club     ON public.bottle_service (club_id);
CREATE INDEX IF NOT EXISTS idx_club_settings_club      ON public.club_settings (club_id);
CREATE INDEX IF NOT EXISTS idx_customer_entries_club    ON public.customer_entries (club_id);
CREATE INDEX IF NOT EXISTS idx_dance_sessions_club      ON public.dance_sessions (club_id);
CREATE INDEX IF NOT EXISTS idx_dance_tiers_club         ON public.dance_tiers (club_id);
CREATE INDEX IF NOT EXISTS idx_dancer_ban_log_club      ON public.dancer_ban_log (club_id);
CREATE INDEX IF NOT EXISTS idx_dancer_event_log_club    ON public.dancer_event_log (club_id);
CREATE INDEX IF NOT EXISTS idx_dancer_stage_names_club  ON public.dancer_stage_names (club_id);
CREATE INDEX IF NOT EXISTS idx_dancers_club             ON public.dancers (club_id);
CREATE INDEX IF NOT EXISTS idx_distributors_club        ON public.distributors (club_id);
CREATE INDEX IF NOT EXISTS idx_early_leave_codes_club   ON public.early_leave_codes (club_id);
CREATE INDEX IF NOT EXISTS idx_entry_tiers_club         ON public.entry_tiers (club_id);
CREATE INDEX IF NOT EXISTS idx_guest_visits_club        ON public.guest_visits (club_id);
CREATE INDEX IF NOT EXISTS idx_guests_club              ON public.guests (club_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_club      ON public.kiosk_sessions (club_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_club     ON public.payment_history (club_id);
CREATE INDEX IF NOT EXISTS idx_profiles_club            ON public.profiles (club_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_club         ON public.promo_codes (club_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_club   ON public.promo_redemptions (club_id);
CREATE INDEX IF NOT EXISTS idx_room_sessions_club       ON public.room_sessions (club_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_club    ON public.staff_attendance (club_id);
CREATE INDEX IF NOT EXISTS idx_stage_fines_club         ON public.stage_fines (club_id);
CREATE INDEX IF NOT EXISTS idx_stage_rotation_club      ON public.stage_rotation (club_id);
CREATE INDEX IF NOT EXISTS idx_stage_sessions_club      ON public.stage_sessions (club_id);
CREATE INDEX IF NOT EXISTS idx_transactions_club        ON public.transactions (club_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_club          ON public.user_roles (club_id);
CREATE INDEX IF NOT EXISTS idx_vendors_club             ON public.vendors (club_id);

-- ── 8. Helper function: extract club_id from JWT ─────────────────────────────
CREATE OR REPLACE FUNCTION public.jwt_club_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'club_id')::uuid
$$;

-- ── 9. Drop ALL existing RLS policies, then recreate with club_id scoping ────
-- We drop every policy on every tenant table and replace with a uniform pattern:
--   SELECT:  club_id = jwt_club_id()
--   INSERT:  club_id = jwt_club_id()
--   UPDATE:  club_id = jwt_club_id()
--   DELETE:  club_id = jwt_club_id()
-- Service role bypasses RLS entirely, so Super Admin / edge functions are unaffected.

-- Helper: drop all policies on a table (safe — ignores non-existent)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'attendance_log', 'behaviour_notes', 'bottle_service', 'club_settings',
        'customer_entries', 'dance_sessions', 'dance_tiers', 'dancer_ban_log',
        'dancer_event_log', 'dancer_stage_names', 'dancers', 'distributors',
        'early_leave_codes', 'entry_tiers', 'guest_visits', 'guests',
        'kiosk_sessions', 'payment_history', 'profiles', 'promo_codes',
        'promo_redemptions', 'room_sessions', 'staff_attendance', 'stage_fines',
        'stage_rotation', 'stage_sessions', 'transactions', 'user_roles', 'vendors'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Now create uniform club-scoped policies for every tenant table
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'attendance_log', 'behaviour_notes', 'bottle_service', 'club_settings',
    'customer_entries', 'dance_sessions', 'dance_tiers', 'dancer_ban_log',
    'dancer_event_log', 'dancer_stage_names', 'dancers', 'distributors',
    'early_leave_codes', 'entry_tiers', 'guest_visits', 'guests',
    'kiosk_sessions', 'payment_history', 'profiles', 'promo_codes',
    'promo_redemptions', 'room_sessions', 'staff_attendance', 'stage_fines',
    'stage_rotation', 'stage_sessions', 'transactions', 'user_roles', 'vendors'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT
    EXECUTE format(
      'CREATE POLICY "club_select_%s" ON public.%I FOR SELECT TO authenticated USING (club_id = public.jwt_club_id())',
      tbl, tbl
    );

    -- INSERT
    EXECUTE format(
      'CREATE POLICY "club_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (club_id = public.jwt_club_id())',
      tbl, tbl
    );

    -- UPDATE
    EXECUTE format(
      'CREATE POLICY "club_update_%s" ON public.%I FOR UPDATE TO authenticated USING (club_id = public.jwt_club_id())',
      tbl, tbl
    );

    -- DELETE
    EXECUTE format(
      'CREATE POLICY "club_delete_%s" ON public.%I FOR DELETE TO authenticated USING (club_id = public.jwt_club_id())',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ── 10. clubs table: readable by authenticated (for domain resolver) ─────────
DROP POLICY IF EXISTS "No direct client access to clubs" ON public.clubs;
CREATE POLICY "anyone_can_resolve_domain" ON public.clubs
  FOR SELECT TO anon, authenticated
  USING (true);
