-- Add timing configuration to club_settings
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS open_time         TIME NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS leave_cutoff_time TIME NOT NULL DEFAULT '00:00',
  ADD COLUMN IF NOT EXISTS day_reset_time    TIME NOT NULL DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS late_arrival_time TIME NOT NULL DEFAULT '20:30';

UPDATE public.club_settings SET
  open_time         = '18:00',
  leave_cutoff_time = '00:00',
  day_reset_time    = '06:00',
  late_arrival_time = '20:30';
