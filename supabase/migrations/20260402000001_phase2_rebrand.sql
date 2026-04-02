-- =====================================================================
-- PHASE 2: Rebrand + new business logic tables
-- =====================================================================

-- 1. New role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'house_mom';

-- 2. Distributors (2-for-1 card attribution)
CREATE TABLE IF NOT EXISTS public.distributors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Entry tiers (door panel buttons — replaces flat door_fee)
CREATE TABLE IF NOT EXISTS public.entry_tiers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  price                NUMERIC(10,2) NOT NULL DEFAULT 0,
  description          TEXT,
  requires_distributor BOOLEAN NOT NULL DEFAULT false,
  admits_count         INTEGER NOT NULL DEFAULT 1,  -- 2 for 2-for-1 card
  sort_order           INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.entry_tiers (name, price, description, requires_distributor, admits_count, sort_order) VALUES
  ('Full Cover',    10, 'Default for most customers',                  false, 1, 1),
  ('Reduced Cover',  5, 'Local/frequent visitors',                     false, 1, 2),
  ('VIP',            0, 'Big-spending/high-value guests',              false, 1, 3),
  ('CCC Card',       0, 'Promo cards distributed to local businesses', false, 1, 4),
  ('2-for-1 Card',  10, 'One payment, two people enter',               true,  2, 5)
ON CONFLICT DO NOTHING;

-- 4. Dance tiers (replaces songs model)
CREATE TABLE IF NOT EXISTS public.dance_tiers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  house_pct        NUMERIC(5,2) NOT NULL DEFAULT 70,
  dancer_pct       NUMERIC(5,2) NOT NULL DEFAULT 30,
  duration_seconds INTEGER,     -- null = lap-based / instant
  is_custom        BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.dance_tiers (name, price, house_pct, dancer_pct, duration_seconds, is_custom, sort_order) VALUES
  ('1 Lap',  30,  70, 30, NULL, false, 1),
  ('3 Laps', 90,  70, 30, NULL, false, 2),
  ('15 Min', 140, 70, 30,  900, false, 3),
  ('20 Min', 200, 70, 30, 1200, false, 4),
  ('Stage',  20,  70, 30, NULL, false, 5),
  ('Custom', 0,   70, 30, NULL, true,  6)
ON CONFLICT DO NOTHING;

-- 5. Dance sessions (floor/room dances — new tier model)
CREATE TABLE IF NOT EXISTS public.dance_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_dancer_id     UUID REFERENCES public.dancers(id) NOT NULL,
  secondary_dancer_id   UUID REFERENCES public.dancers(id),
  tier_id               UUID REFERENCES public.dance_tiers(id),
  tier_name             TEXT NOT NULL,
  custom_price          NUMERIC(10,2),
  gross_amount          NUMERIC(10,2) NOT NULL,
  house_cut             NUMERIC(10,2) NOT NULL,
  dancer_cut            NUMERIC(10,2) NOT NULL,
  secondary_dancer_cut  NUMERIC(10,2),
  is_two_girls          BOOLEAN NOT NULL DEFAULT false,
  entry_time            TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_time             TIMESTAMPTZ,
  shift_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by             UUID REFERENCES auth.users(id),
  distributor_id        UUID REFERENCES public.distributors(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Stage rotation (3-slot: on_stage / on_deck / queued)
CREATE TABLE IF NOT EXISTS public.stage_rotation (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id   UUID REFERENCES public.dancers(id) NOT NULL UNIQUE,
  status      TEXT NOT NULL CHECK (status IN ('on_stage', 'on_deck', 'queued')),
  position    INTEGER NOT NULL DEFAULT 0,
  shift_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Bottle service (tracked separately)
CREATE TABLE IF NOT EXISTS public.bottle_service (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount     NUMERIC(10,2) NOT NULL,
  notes      TEXT,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by  UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Dancer financial fields
ALTER TABLE public.dancers
  ADD COLUMN IF NOT EXISTS house_fee_rate      NUMERIC(10,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS late_house_fee_rate NUMERIC(10,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS music_fee_rate      NUMERIC(10,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS late_threshold      TIME,
  ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 9. RLS
ALTER TABLE public.distributors   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_tiers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_tiers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_rotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottle_service ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "auth_select_distributors"   ON public.distributors   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_entry_tiers"    ON public.entry_tiers    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_dance_tiers"    ON public.dance_tiers    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_dance_sessions" ON public.dance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_stage_rotation" ON public.stage_rotation FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_select_bottle_service" ON public.bottle_service FOR SELECT TO authenticated USING (true);

-- Insert for authenticated
CREATE POLICY "auth_insert_dance_sessions" ON public.dance_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_dance_sessions" ON public.dance_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_insert_stage_rotation" ON public.stage_rotation FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_stage_rotation" ON public.stage_rotation FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_stage_rotation" ON public.stage_rotation FOR DELETE TO authenticated USING (true);
CREATE POLICY "auth_insert_bottle_service" ON public.bottle_service FOR INSERT TO authenticated WITH CHECK (true);

-- Admin-only management of config tables
CREATE POLICY "admin_manage_distributors" ON public.distributors
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_manage_entry_tiers" ON public.entry_tiers
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_manage_dance_tiers" ON public.dance_tiers
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
