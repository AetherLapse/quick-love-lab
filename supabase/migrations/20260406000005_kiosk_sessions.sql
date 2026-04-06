-- Tracks active screens (iPads, desktops) connected to the platform
create table if not exists public.kiosk_sessions (
  id            uuid        primary key default gen_random_uuid(),
  session_token text        unique not null,
  user_id       uuid        references auth.users(id) on delete cascade,
  role          text,
  path          text        default '/',
  user_agent    text,
  last_seen     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.kiosk_sessions enable row level security;

-- Each authenticated user can manage their own session row
create policy "kiosk_self"
  on public.kiosk_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins / owners / managers can read all active sessions
create policy "kiosk_admin_select"
  on public.kiosk_sessions for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('admin', 'owner', 'manager')
    )
  );
