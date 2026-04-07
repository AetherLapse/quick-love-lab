-- Store door staff enrollment PIN in their profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_code TEXT;
