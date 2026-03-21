-- Cascaded dancer deletion that bypasses RLS
-- Called from the frontend via supabase.rpc('delete_dancer_cascade', { p_dancer_id: '...' })
create or replace function public.delete_dancer_cascade(p_dancer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.dancer_event_log where dancer_id = p_dancer_id;
  delete from public.room_sessions     where dancer_id = p_dancer_id;
  delete from public.attendance_log    where dancer_id = p_dancer_id;
  delete from public.dancers           where id         = p_dancer_id;
end;
$$;

-- Only authenticated users can call this (admin session required)
revoke all on function public.delete_dancer_cascade(uuid) from public, anon;
grant execute on function public.delete_dancer_cascade(uuid) to authenticated;
