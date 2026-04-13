-- Encrypted SSN storage — ciphertext + IV, never plain text
ALTER TABLE public.dancers
  ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS ssn_iv        TEXT;
