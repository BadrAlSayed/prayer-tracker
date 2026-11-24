-- Prayer debt journey (one row per signed-in user) and the log of prayers made up.
-- Run this once in the Supabase SQL Editor.

create type public.debt_unit as enum ('day', 'month', 'year');

create type public.prayer_name as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');

create table public.prayer_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  debt_amount integer not null check (debt_amount > 0),
  debt_unit public.debt_unit not null,
  started_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prayer public.prayer_name not null,
  prayed_on date not null check (prayed_on <= current_date),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index prayer_logs_user_prayed_on_idx
  on public.prayer_logs (user_id, prayed_on desc);

create index prayer_logs_user_created_at_idx
  on public.prayer_logs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prayer_debts_set_updated_at
  before update on public.prayer_debts
  for each row
  execute function public.set_updated_at();

alter table public.prayer_debts enable row level security;
alter table public.prayer_logs enable row level security;

create policy "Users read their own debt"
  on public.prayer_debts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their own debt"
  on public.prayer_debts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own debt"
  on public.prayer_debts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own debt"
  on public.prayer_debts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users read their own logs"
  on public.prayer_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their own logs"
  on public.prayer_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own logs"
  on public.prayer_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own logs"
  on public.prayer_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant usage on type public.debt_unit, public.prayer_name to authenticated;
grant select, insert, update, delete on public.prayer_debts to authenticated;
grant select, insert, update, delete on public.prayer_logs to authenticated;
