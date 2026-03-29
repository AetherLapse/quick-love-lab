-- =============================================================
-- DEMO v2: Entry Tiers, Distributors, Stage Rotation, Dancer Fees
-- =============================================================

-- 1. Add new role values
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE 'owner';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.app_role ADD VALUE 'house_mom'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add stage status values to dancer_live_status
DO $$ BEGIN ALTER TYPE public.dancer_live_status ADD VALUE 'on_stage'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.dancer_live_status ADD VALUE 'on_deck';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Entry tier enum
DO $$ BEGIN
  CREATE TYPE public.entry_tier AS ENUM (
    'full_cover', 'reduced', 'vip', 'ccc_card', 'two_for_one'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================
-- 4. DISTRIBUTORS TABLE
-- Managed by owner. Attributed when a 2-for-1 card is redeemed.
-- Commission report (owner-only) uses this for payout calculations.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.distributors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  contact_info text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distributors_read" ON public.distributors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "distributors_write" ON public.distributors
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'owner')
  );


-- =============================================================
-- 5. ADD TIER COLUMNS TO customer_entries
-- =============================================================

ALTER TABLE public.customer_entries
  ADD COLUMN IF NOT EXISTS tier           public.entry_tier DEFAULT 'full_cover',
  ADD COLUMN IF NOT EXISTS party_size     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS distributor_id uuid REFERENCES public.distributors(id);


-- =============================================================
-- 6. STAGE ROTATION TABLE
-- Tracks which dancers are on_stage / on_deck / queued for tonight.
-- One record per dancer per shift_date. Updated in-place (not append-only).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.stage_rotation (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id   uuid REFERENCES public.dancers(id) ON DELETE CASCADE NOT NULL,
  slot_label  text NOT NULL DEFAULT 'queued', -- 'on_stage' | 'on_deck' | 'queued'
  slot_order  integer NOT NULL DEFAULT 0,
  shift_date  date NOT NULL DEFAULT CURRENT_DATE,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dancer_id, shift_date)
);

ALTER TABLE public.stage_rotation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_rotation_read" ON public.stage_rotation
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stage_rotation_write" ON public.stage_rotation
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')      OR
    public.has_role(auth.uid(), 'owner')      OR
    public.has_role(auth.uid(), 'manager')    OR
    public.has_role(auth.uid(), 'door_staff')
  );


-- =============================================================
-- 7. DANCER SHIFT FEES TABLE
-- Per-shift fee ledger + carry-forward debt tracking.
-- One row per dancer per shift_date (upserted at check-in).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.dancer_shift_fees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id        uuid REFERENCES public.dancers(id) ON DELETE CASCADE NOT NULL,
  shift_date       date NOT NULL DEFAULT CURRENT_DATE,
  house_fee        numeric(10,2) NOT NULL DEFAULT 30,
  music_fee        numeric(10,2) NOT NULL DEFAULT 20,
  late_fee         numeric(10,2) NOT NULL DEFAULT 0,
  is_late          boolean NOT NULL DEFAULT false,
  dance_earnings   numeric(10,2) NOT NULL DEFAULT 0,
  carry_forward_in numeric(10,2) NOT NULL DEFAULT 0, -- debt carried from previous nights
  is_settled       boolean NOT NULL DEFAULT false,
  settled_at       timestamptz,
  notes            text,
  logged_by        uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dancer_id, shift_date)
);

-- net = dance_earnings - house_fee - music_fee - late_fee - carry_forward_in
-- positive → club owes dancer; negative → dancer owes club

ALTER TABLE public.dancer_shift_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shift_fees_read" ON public.dancer_shift_fees
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')     OR
    public.has_role(auth.uid(), 'owner')     OR
    public.has_role(auth.uid(), 'manager')   OR
    public.has_role(auth.uid(), 'house_mom')
  );

CREATE POLICY "shift_fees_insert" ON public.dancer_shift_fees
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')     OR
    public.has_role(auth.uid(), 'owner')     OR
    public.has_role(auth.uid(), 'manager')   OR
    public.has_role(auth.uid(), 'house_mom')
  );

CREATE POLICY "shift_fees_update" ON public.dancer_shift_fees
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')     OR
    public.has_role(auth.uid(), 'owner')     OR
    public.has_role(auth.uid(), 'manager')   OR
    public.has_role(auth.uid(), 'house_mom')
  );


-- =============================================================
-- 8. ADD FEE + BALANCE FIELDS TO dancers TABLE
-- outstanding_balance: accumulated unpaid debt carried forward.
-- Surfaced at next check-in; must be cleared before shift starts.
-- =============================================================

ALTER TABLE public.dancers
  ADD COLUMN IF NOT EXISTS outstanding_balance numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_threshold_time  time          NOT NULL DEFAULT '20:00:00',
  ADD COLUMN IF NOT EXISTS house_fee_rate        numeric(10,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS music_fee_rate        numeric(10,2) NOT NULL DEFAULT 20;


-- =============================================================
-- 9. ADD FEE FIELDS TO attendance_log
-- =============================================================

ALTER TABLE public.attendance_log
  ADD COLUMN IF NOT EXISTS house_fee  numeric(10,2) NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS music_fee  numeric(10,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS late_fee   numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_late    boolean       NOT NULL DEFAULT false;


-- =============================================================
-- 10. SEED: default distributors (demo data)
-- =============================================================

INSERT INTO public.distributors (name, commission_rate, is_active) VALUES
  ('City Promo Group', 10.00, true),
  ('Downtown Hospitality', 8.00,  true),
  ('VIP Card Co.',         12.00, true)
ON CONFLICT DO NOTHING;
