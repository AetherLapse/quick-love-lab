-- Track cumulative package additions per room session (e.g. "1 Lap ($30) + 3 Laps ($90)")
ALTER TABLE public.room_sessions
  ADD COLUMN IF NOT EXISTS package_log TEXT;
