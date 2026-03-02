-- quiz_submissions table
create table if not exists public.quiz_submissions (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  primary_magnet        text,
  profile_type          text,
  radar_scores          jsonb,
  audit_data            jsonb,
  newsletter_subscribed boolean not null default false,
  created_at            timestamptz not null default now()
);

-- If the table already exists, add the new columns without erroring
alter table public.quiz_submissions add column if not exists audit_data jsonb;
alter table public.quiz_submissions add column if not exists newsletter_subscribed boolean not null default false;
alter table public.quiz_submissions add column if not exists primary_magnet text;

-- Index for lookup by email
create index if not exists quiz_submissions_email_idx on public.quiz_submissions (email);

-- RLS
alter table public.quiz_submissions enable row level security;

create policy "anon_insert"
  on public.quiz_submissions
  for insert
  to anon
  with check (true);

create policy "auth_select"
  on public.quiz_submissions
  for select
  to authenticated
  using (true);
