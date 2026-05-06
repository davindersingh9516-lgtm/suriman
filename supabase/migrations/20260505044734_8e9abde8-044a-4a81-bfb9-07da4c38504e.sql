
-- 1. Cloud-synced user settings (cross-device sync)
create table if not exists public.user_settings (
  user_id uuid primary key,
  daily_goal integer not null default 5,
  mantra jsonb,
  haptics boolean not null default true,
  sound text not null default 'ghanti',
  reminder_enabled boolean not null default true,
  reminder_time text not null default '07:00',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users view own settings"
  on public.user_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own settings"
  on public.user_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own settings"
  on public.user_settings for update to authenticated
  using (auth.uid() = user_id);

create trigger user_settings_touch
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- 2. OTP rate limiting (per identifier per hour)
create table if not exists public.otp_requests (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  channel text not null,
  requested_at timestamptz not null default now()
);

create index if not exists otp_requests_identifier_time_idx
  on public.otp_requests (identifier, requested_at desc);

alter table public.otp_requests enable row level security;
-- No policies: only service role (server) reads/writes. Authenticated users get nothing.

-- 3. Tighten chants — explicit deny DELETE (future-proof)
create policy "No deletes on chants"
  on public.chants for delete to authenticated
  using (false);

-- 4. Groups: allow creator to update/delete their own group
create policy "Creator can update own group"
  on public.groups for update to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Creator can delete own group"
  on public.groups for delete to authenticated
  using (auth.uid() = created_by);
