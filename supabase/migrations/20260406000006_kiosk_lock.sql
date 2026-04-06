-- Add lock status to kiosk sessions
ALTER TABLE public.kiosk_sessions
  ADD COLUMN IF NOT EXISTS status    TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Admins and owners can update (lock/unlock) any session
CREATE POLICY "kiosk_admin_update"
  ON public.kiosk_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'owner')
    )
  );
