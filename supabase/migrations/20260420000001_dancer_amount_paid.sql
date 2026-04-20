-- Track how much of their house fees a dancer has actually paid the door staff
ALTER TABLE attendance_log
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Door staff need UPDATE on attendance_log to record payments
CREATE POLICY "door_staff_update_attendance_log"
  ON attendance_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin','owner','manager','door_staff','house_mom')
    )
  );
