-- Allow any authenticated staff to INSERT new dancers (enrollment)
-- Previously only the admin ALL-policy covered inserts, blocking door staff.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dancers' AND policyname = 'staff_insert_dancers'
  ) THEN
    CREATE POLICY "staff_insert_dancers" ON public.dancers
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
