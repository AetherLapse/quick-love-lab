ALTER TABLE public.customer_entries
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
