-- Allow storing a free-text vendor name when no known vendor is selected
ALTER TABLE public.customer_entries
  ADD COLUMN IF NOT EXISTS vendor_name TEXT;
