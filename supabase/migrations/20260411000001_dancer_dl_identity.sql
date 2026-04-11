-- Driving licence identity fields on dancers
-- dl_hash: SHA-256 of the DL number — used for returning-dancer detection
-- dl_masked: last 4 chars of DL number for display only
-- dob: date of birth extracted from DL
-- dl_address: address extracted from DL
-- dl_full_name: legal name extracted from DL (may differ from registered stage_name / full_name)
ALTER TABLE public.dancers
  ADD COLUMN IF NOT EXISTS dl_hash      TEXT,
  ADD COLUMN IF NOT EXISTS dl_masked    TEXT,
  ADD COLUMN IF NOT EXISTS dob          DATE,
  ADD COLUMN IF NOT EXISTS dl_address   TEXT,
  ADD COLUMN IF NOT EXISTS dl_full_name TEXT;

-- Non-unique index — we want to detect duplicates but not hard-block them
CREATE INDEX IF NOT EXISTS dancers_dl_hash_idx ON public.dancers (dl_hash);
