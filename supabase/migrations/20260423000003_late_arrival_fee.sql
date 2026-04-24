-- Separate late-arrival fee tracked independently from house fee
ALTER TABLE public.attendance_log
  ADD COLUMN IF NOT EXISTS late_arrival_fee_amount numeric NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
