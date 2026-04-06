-- Track which entry tier was used for each customer entry
ALTER TABLE public.customer_entries
  ADD COLUMN IF NOT EXISTS entry_tier_id UUID REFERENCES public.entry_tiers(id);
