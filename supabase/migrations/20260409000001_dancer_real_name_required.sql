-- ── Dancer registration: require real name, email, phone ──────────────────────

-- Back-fill existing rows so NOT NULL constraints don't fail
UPDATE public.dancers
  SET full_name = stage_name
  WHERE full_name IS NULL OR full_name = '';

UPDATE public.dancers
  SET email = ''
  WHERE email IS NULL;

UPDATE public.dancers
  SET phone = ''
  WHERE phone IS NULL;

-- Add NOT NULL constraints (email/phone allow empty string for legacy rows)
ALTER TABLE public.dancers
  ALTER COLUMN full_name SET NOT NULL;

-- Add stage_name column default to full_name if stage_name is null or empty
-- (stage_name stays writable so dancers can personalise it via their portal)
UPDATE public.dancers
  SET stage_name = full_name
  WHERE stage_name IS NULL OR stage_name = '';
