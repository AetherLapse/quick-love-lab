-- 1. Add a human-readable dancer_number to the dancers table
--    Auto-assigned sequential ID, e.g. 1, 2, 3 … displayed as D001 in the UI
ALTER TABLE public.dancers
  ADD COLUMN IF NOT EXISTS dancer_number SERIAL;

-- Create a unique index so it can be used as a stable display key
CREATE UNIQUE INDEX IF NOT EXISTS dancers_dancer_number_idx ON public.dancers (dancer_number);

-- 2. Fix log_dance_session RPC to match actual dance_sessions schema
--    Columns: primary_dancer_id, tier_id, tier_name, gross_amount, house_cut, dancer_cut
create or replace function public.log_dance_session(
  p_dancer_id      uuid,
  p_tier_id        uuid,
  p_total_amount   numeric,
  p_duration_min   numeric  default null,
  p_notes          text     default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id          uuid;
  v_tier_name   text;
  v_house_pct   numeric;
  v_dancer_pct  numeric;
  v_house_cut   numeric;
  v_dancer_cut  numeric;
begin
  -- Lookup tier details (name + split percentages)
  select name, house_pct, dancer_pct
    into v_tier_name, v_house_pct, v_dancer_pct
    from public.dance_tiers
   where id = p_tier_id;

  -- Fallback if tier not found (e.g. custom)
  if v_tier_name is null then
    v_tier_name  := 'Custom';
    v_house_pct  := 70;
    v_dancer_pct := 30;
  end if;

  v_house_cut  := round(p_total_amount * v_house_pct  / 100, 2);
  v_dancer_cut := round(p_total_amount * v_dancer_pct / 100, 2);

  insert into public.dance_sessions (
    primary_dancer_id,
    tier_id,
    tier_name,
    gross_amount,
    house_cut,
    dancer_cut,
    logged_by
  ) values (
    p_dancer_id,
    p_tier_id,
    v_tier_name,
    p_total_amount,
    v_house_cut,
    v_dancer_cut,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_dance_session to authenticated;

-- 3. Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
