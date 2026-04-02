-- Ensure dance_sessions table exists with all required columns
-- and notify PostgREST to reload its schema cache.

create table if not exists public.dance_sessions (
  id               uuid primary key default gen_random_uuid(),
  dancer_id        uuid not null references public.dancers(id) on delete cascade,
  tier_id          uuid references public.dance_tiers(id),
  customer_count   int  not null default 1,
  duration_minutes numeric,
  total_amount     numeric not null default 0,
  completed_at     timestamptz default now(),
  notes            text,
  created_at       timestamptz default now()
);

-- Add any missing columns idempotently
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dance_sessions'
      and column_name  = 'customer_count'
  ) then
    alter table public.dance_sessions add column customer_count int not null default 1;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dance_sessions'
      and column_name  = 'completed_at'
  ) then
    alter table public.dance_sessions add column completed_at timestamptz default now();
  end if;
end $$;

-- RLS
alter table public.dance_sessions enable row level security;

drop policy if exists "dance_sessions_read"   on public.dance_sessions;
drop policy if exists "dance_sessions_insert"  on public.dance_sessions;

create policy "dance_sessions_read"
  on public.dance_sessions for select
  using (auth.role() = 'authenticated');

create policy "dance_sessions_insert"
  on public.dance_sessions for insert
  with check (auth.role() = 'authenticated');

-- Force PostgREST to reload its schema cache
notify pgrst, 'reload schema';
