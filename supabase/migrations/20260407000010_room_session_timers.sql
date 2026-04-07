-- Add duration tracking to dance_tiers and room_sessions

-- dance_tiers: how long is each package
ALTER TABLE public.dance_tiers
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Set durations based on known tier names
UPDATE public.dance_tiers SET duration_minutes = 3  WHERE LOWER(name) = '1 lap';
UPDATE public.dance_tiers SET duration_minutes = 9  WHERE LOWER(name) = '3 laps';
UPDATE public.dance_tiers SET duration_minutes = 15 WHERE LOWER(name) = '15 min';
UPDATE public.dance_tiers SET duration_minutes = 20 WHERE LOWER(name) = '20 min';
-- Stage and Custom have no fixed timer

-- room_sessions: store the agreed-upon duration when session is created
ALTER TABLE public.room_sessions
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS extension_minutes INTEGER NOT NULL DEFAULT 0;
