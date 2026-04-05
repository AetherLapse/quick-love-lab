-- 1. Auto-generate employee_id from dancer_number
ALTER TABLE public.dancers
  ALTER COLUMN employee_id DROP NOT NULL,
  ALTER COLUMN employee_id SET DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.auto_set_employee_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.employee_id IS NULL OR trim(NEW.employee_id) = '' THEN
    NEW.employee_id := 'EMP-' || LPAD(NEW.dancer_number::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_employee_id ON public.dancers;
CREATE TRIGGER trg_auto_employee_id
  BEFORE INSERT ON public.dancers
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_employee_id();

-- 2. Enrollment tracking columns
--    (facial_hash already exists from phase1 migration for Rekognition FaceId)
ALTER TABLE public.dancers
  ADD COLUMN IF NOT EXISTS is_enrolled  BOOLEAN    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enrolled_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrolled_by  UUID REFERENCES auth.users(id);

-- 3. RLS: allow authenticated staff to update enrollment fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dancers' AND policyname = 'auth_update_dancers'
  ) THEN
    CREATE POLICY "auth_update_dancers" ON public.dancers
      FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
