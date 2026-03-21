-- Add profile fields to guests
alter table public.guests
  add column if not exists full_name      text,
  add column if not exists notes          text,
  add column if not exists flagged        boolean not null default false,
  add column if not exists flagged_reason text;

-- Update upsert_guest to accept and store full_name (only fills in when first seen)
create or replace function public.upsert_guest(
  p_dl_hash    text,
  p_display_id text,
  p_door_fee   numeric,
  p_logged_by  text,
  p_full_name  text default null
) returns uuid as $$
declare
  v_guest_id uuid;
begin
  insert into public.guests (dl_hash, guest_display_id, full_name)
  values (p_dl_hash, p_display_id, p_full_name)
  on conflict (dl_hash) do update
    set full_name = coalesce(guests.full_name, excluded.full_name);

  select id into v_guest_id from public.guests where dl_hash = p_dl_hash;

  insert into public.guest_visits (guest_id, door_fee, logged_by)
  values (v_guest_id, p_door_fee, p_logged_by);

  return v_guest_id;
end;
$$ language plpgsql security definer set search_path = public;
