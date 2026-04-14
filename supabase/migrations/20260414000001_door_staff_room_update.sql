-- Allow door_staff to update room_sessions (assign queued sessions to rooms)
DROP POLICY IF EXISTS "Staff can update room sessions today" ON public.room_sessions;

CREATE POLICY "Staff can update room sessions today"
  ON public.room_sessions FOR UPDATE TO authenticated
  USING (
    shift_date = CURRENT_DATE AND (
      public.has_role(auth.uid(), 'room_attendant') OR
      public.has_role(auth.uid(), 'door_staff') OR
      public.has_role(auth.uid(), 'manager') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'owner')
    )
  );
