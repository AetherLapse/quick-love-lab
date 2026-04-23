-- Add new staff roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'bartender';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'dj';

-- Staff attendance / check-in tracking
CREATE TABLE IF NOT EXISTS staff_attendance (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        text        NOT NULL,
  shift_date  date        NOT NULL DEFAULT CURRENT_DATE,
  clock_in    timestamptz NOT NULL DEFAULT now(),
  clock_out   timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_attendance_profile_date
  ON staff_attendance (profile_id, shift_date);

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON staff_attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all" ON staff_attendance
  FOR ALL TO service_role USING (true) WITH CHECK (true);
