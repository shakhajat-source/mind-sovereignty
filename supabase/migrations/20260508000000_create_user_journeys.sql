-- Create user_journeys table for the 4-week staggered email programme
create table public.user_journeys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  target_goal  text,
  start_date   timestamptz not null default now(),
  current_day  integer not null default 0,
  status       text not null default 'active',

  constraint user_journeys_status_check
    check (status in ('active', 'completed', 'cancelled'))
);

-- Indexes
create index user_journeys_email_idx  on public.user_journeys (email);
create index user_journeys_status_idx on public.user_journeys (status);
create index user_journeys_user_id_idx on public.user_journeys (user_id);

-- Enable RLS
alter table public.user_journeys enable row level security;

-- Authenticated users can read their own journey (matched by user_id)
create policy "Users can view their own journey"
  on public.user_journeys
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can update their own journey (e.g. cancel it)
create policy "Users can update their own journey"
  on public.user_journeys
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role bypasses RLS entirely (used by edge functions / cron jobs
-- that advance current_day and send emails)
-- No explicit policy needed — service_role ignores RLS by default.

-- Unauthenticated inserts are allowed so the quiz can create a journey
-- before the user has an account (user_id is nullable)
create policy "Anyone can start a journey"
  on public.user_journeys
  for insert
  to anon, authenticated
  with check (true);
