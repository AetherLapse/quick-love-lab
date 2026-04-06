-- Track how many guests a single entry covers (e.g. 2-for-1 card = 2)
ALTER TABLE public.customer_entries
  ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 1;
