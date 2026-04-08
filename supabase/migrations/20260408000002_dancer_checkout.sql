-- ── Dancer check-out & early-leave fine tracking ──────────────────────────────

-- Add checkout fields to attendance_log
ALTER TABLE public.attendance_log
  ADD COLUMN IF NOT EXISTS early_leave_fine  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fine_waived       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS waiver_code_id    UUID,
  ADD COLUMN IF NOT EXISTS checked_out_by   UUID         REFERENCES auth.users(id);

-- ── One-time early-leave permit codes ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.early_leave_codes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT        UNIQUE NOT NULL,
  reason             TEXT        NOT NULL,
  generated_by       UUID        NOT NULL REFERENCES auth.users(id),
  dancer_id          UUID        REFERENCES public.dancers(id),   -- NULL = valid for any dancer
  used               BOOLEAN     NOT NULL DEFAULT FALSE,
  used_at            TIMESTAMPTZ,
  used_by_dancer_id  UUID        REFERENCES public.dancers(id),
  shift_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.early_leave_codes ENABLE ROW LEVEL SECURITY;

-- Admin / owner / manager can create codes and view all
CREATE POLICY "admin_manage_early_leave_codes"
  ON public.early_leave_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'owner', 'manager')
    )
  );

-- All authenticated staff can read codes (needed to validate at door)
CREATE POLICY "staff_read_early_leave_codes"
  ON public.early_leave_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated staff can mark a code as used
CREATE POLICY "staff_use_early_leave_codes"
  ON public.early_leave_codes FOR UPDATE
  USING (auth.uid() IS NOT NULL);
