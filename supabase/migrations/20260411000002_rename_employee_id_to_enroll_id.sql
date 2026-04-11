-- Rename employee_id → enroll_id on dancers table
ALTER TABLE public.dancers RENAME COLUMN employee_id TO enroll_id;

-- Update the auto-assign trigger to use the new column name
CREATE OR REPLACE FUNCTION public.auto_set_employee_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.enroll_id IS NULL OR trim(NEW.enroll_id) = '' THEN
    NEW.enroll_id := 'D-' || LPAD(NEW.dancer_number::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;
