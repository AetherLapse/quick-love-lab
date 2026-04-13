-- ── Stage fines log ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stage_fines (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dancer_id    UUID        REFERENCES public.dancers(id) ON DELETE SET NULL,
  dancer_name  TEXT        NOT NULL,
  reason       TEXT        NOT NULL,
  amount       INTEGER     NOT NULL DEFAULT 25,
  issued_by    UUID        REFERENCES auth.users(id),
  shift_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stage_fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_stage_fines"
  ON public.stage_fines FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── Early-leave waiver code: replace one-time use with time window ─────────────

ALTER TABLE public.early_leave_codes
  ADD COLUMN IF NOT EXISTS valid_from  TIME,   -- e.g. '03:00:00'
  ADD COLUMN IF NOT EXISTS valid_until TIME;   -- e.g. '03:05:00'

-- Drop the used-flag enforcement (now just informational audit column)
-- valid_from / valid_until NULL means old behavior (no window, treat as always valid today)
