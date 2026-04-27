UPDATE public.dance_tiers
SET name = '30 Min', price = 250, duration_seconds = 1800
WHERE name = '20 Min' AND price = 200;
