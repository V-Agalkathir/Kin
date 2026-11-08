-- Kin schema (Phase 2). Row-level security: parent sees own data; linked family can read it.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('parent', 'family')),
  display_name text,
  language text default 'en',
  phone text
);

create table family_links (
  parent_id uuid references profiles(id) on delete cascade,
  family_id uuid references profiles(id) on delete cascade,
  is_alert_contact boolean default false,
  primary key (parent_id, family_id)
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  sit_to_stand_sec real,
  reps_detected int,
  wpm real,
  avg_pause_ms real,
  word_count int,
  transcript text,
  language text,
  flags jsonb default '[]',
  summary_parent text,
  summary_family text
);

create table fall_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  detected_at timestamptz not null,
  responded_ok boolean not null,
  seconds_down real,
  escalated boolean default false
);

alter table checkins enable row level security;
alter table fall_alerts enable row level security;

create policy "own or linked family can read checkins" on checkins for select using (
  user_id = auth.uid()
  or exists (select 1 from family_links f where f.parent_id = checkins.user_id and f.family_id = auth.uid())
);

create policy "own or linked family can read alerts" on fall_alerts for select using (
  user_id = auth.uid()
  or exists (select 1 from family_links f where f.parent_id = fall_alerts.user_id and f.family_id = auth.uid())
);
