-- RPC to insert dance sessions, bypassing PostgREST schema cache issues
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
  v_id uuid;
begin
  insert into public.dance_sessions (dancer_id, tier_id, total_amount, duration_minutes, notes)
  values (p_dancer_id, p_tier_id, p_total_amount, p_duration_min, p_notes)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_dance_session to authenticated;
