-- ── Vendors (distributors who hand out promo cards) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_vendors" ON public.vendors FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- ── Promo codes (QR-scannable cards linked to entry tiers) ───────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,           -- the scannable string, e.g. CCCFREE
  label           TEXT,                           -- friendly display name
  entry_tier_id   UUID REFERENCES public.entry_tiers(id) ON DELETE SET NULL,
  vendor_id       UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  max_uses        INTEGER NOT NULL DEFAULT 1,     -- 1 = single-use, 0 = unlimited
  use_count       INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_promo_codes" ON public.promo_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_promo_codes" ON public.promo_codes FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
-- Door staff can UPDATE (increment use_count) when redeeming
CREATE POLICY "staff_update_promo_codes" ON public.promo_codes FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ── Promo redemptions (audit trail per scan) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
  redeemed_by   UUID REFERENCES auth.users(id),
  guest_visit_id UUID,                            -- nullable, linked after guest_visit insert
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  shift_date    DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_redemptions"  ON public.promo_redemptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_redemptions"  ON public.promo_redemptions FOR INSERT TO authenticated WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
