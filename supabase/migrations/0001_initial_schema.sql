-- ============================================================================
-- Booking Business Platform: Initial Production PostgreSQL / Supabase Schema
-- Includes tables, GiST double-booking prevention, RLS policies, audit triggers,
-- public storefront RPCs, admin analytics RPCs, and hold-expiry cleanup.
-- ============================================================================

-- 1. Required Extensions
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;

-- 2. Private Helper Schema
create schema if not exists private;

-- 3. Custom Enums
do $$ begin
  create type public.booking_status as enum (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show',
    'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending',
    'succeeded',
    'failed',
    'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.resource_kind as enum (
    'staff',
    'room',
    'equipment',
    'other'
  );
exception when duplicate_object then null; end $$;

-- 4. Tables

-- Profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admins (authorization list)
create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Business Settings (singleton white-label & operational configuration)
create table if not exists public.business_settings (
  id boolean primary key default true check (id = true),
  business_name text not null check (char_length(business_name) between 1 and 120),
  timezone text not null default 'Africa/Lagos',
  currency char(3) not null default 'NGN',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 120),
  min_notice_minutes integer not null default 60 check (min_notice_minutes >= 0),
  max_advance_days integer not null default 60 check (max_advance_days between 1 and 730),
  cancellation_window_hours integer not null default 24 check (cancellation_window_hours >= 0),
  hold_minutes integer not null default 15 check (hold_minutes between 1 and 120),
  max_pending_per_user integer not null default 3 check (max_pending_per_user between 1 and 20),
  -- White-label branding & policy fields
  tagline text,
  support_email text,
  support_phone text,
  address text,
  logo_initials text,
  brand_color text default '#0f172a',
  currency_symbol text default '₦',
  cancellation_policy text,
  enable_online_payments boolean not null default true,
  require_deposit boolean not null default false,
  deposit_percentage integer not null default 20 check (deposit_percentage between 5 and 100),
  updated_at timestamptz not null default now()
);

-- Seed singleton business_settings row
insert into public.business_settings (
  id,
  business_name,
  timezone,
  currency,
  tagline,
  support_email,
  support_phone,
  address,
  logo_initials,
  brand_color,
  currency_symbol,
  cancellation_policy
) values (
  true,
  'Apex Vitality & Wellness Clinic',
  'Africa/Lagos',
  'NGN',
  'Premier aesthetic wellness & medical practice',
  'care@apexwellness.com',
  '+234 800 000 1111',
  '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  'AV',
  '#0f172a',
  '₦',
  'Cancellations made at least 24 hours prior to the appointment incur no penalty. Within 24 hours, fees or deposits may be retained.'
) on conflict (id) do nothing;

-- Services Catalog
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  price_minor bigint not null default 0 check (price_minor >= 0),
  currency char(3) not null default 'NGN',
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Bookable Resources (staff, rooms, equipment)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  kind public.resource_kind not null default 'staff',
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Service <-> Resource Assignment
create table if not exists public.service_resources (
  service_id uuid not null references public.services(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  primary key (service_id, resource_id)
);

-- Resource <-> Staff User Mapping
create table if not exists public.resource_staff (
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (resource_id, user_id)
);

-- Weekly Recurring Availability Rules (weekday 0=Sun..6=Sat)
create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- Resource Time-Off Blocks
create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  check (ends_at > starts_at)
);

create index if not exists time_off_resource_during_gist on public.time_off using gist (resource_id, during);

-- Bookings (with database-level double-booking prevention)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('BK-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))),
  customer_id uuid references public.profiles(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  resource_id uuid not null references public.resources(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  during tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status public.booking_status not null default 'pending',
  hold_expires_at timestamptz,
  price_minor bigint not null check (price_minor >= 0),
  currency char(3) not null default 'NGN',
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  contact_email text not null,
  contact_phone text,
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status <> 'pending') or (hold_expires_at is not null)),
  check ((status <> 'confirmed') or (hold_expires_at is null))
);

-- Atomic double-booking prevention via GiST exclusion constraint
alter table public.bookings
  drop constraint if exists bookings_no_overlap_excl;

alter table public.bookings
  add constraint bookings_no_overlap_excl
  exclude using gist (resource_id with =, during with &&)
  where (status in ('pending', 'confirmed'));

create index if not exists bookings_starts_at_idx on public.bookings (starts_at);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_contact_name_trgm_idx on public.bookings using gin (contact_name gin_trgm_ops);
create index if not exists bookings_contact_email_trgm_idx on public.bookings using gin (contact_email gin_trgm_ops);

-- Internal Booking Notes
create table if not exists public.booking_notes (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  note text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Payments Ledger
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider text not null,
  provider_reference text not null unique,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'NGN',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_booking_id_idx on public.payments (booking_id);
create index if not exists payments_created_at_idx on public.payments (created_at desc);

-- Immutable Audit Log
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_table_record_idx on public.audit_log (table_name, record_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

-- 5. Security & Timestamp Trigger Functions

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  ) and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists trg_resources_updated_at on public.resources;
create trigger trg_resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Audit Trigger
create or replace function private.record_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record_id text;
begin
  if (tg_op = 'DELETE') then
    v_record_id := old.id::text;
    insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
    values ((select auth.uid()), tg_table_name, v_record_id, 'DELETE', to_jsonb(old), null);
    return old;
  elsif (tg_op = 'UPDATE') then
    v_record_id := new.id::text;
    insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
    values ((select auth.uid()), tg_table_name, v_record_id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'INSERT') then
    v_record_id := new.id::text;
    insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
    values ((select auth.uid()), tg_table_name, v_record_id, 'INSERT', null, to_jsonb(new));
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists audit_bookings on public.bookings;
create trigger audit_bookings after insert or update or delete on public.bookings
  for each row execute function private.record_audit_log();

drop trigger if exists audit_services on public.services;
create trigger audit_services after insert or update or delete on public.services
  for each row execute function private.record_audit_log();

drop trigger if exists audit_resources on public.resources;
create trigger audit_resources after insert or update or delete on public.resources
  for each row execute function private.record_audit_log();

drop trigger if exists audit_payments on public.payments;
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function private.record_audit_log();

drop trigger if exists audit_business_settings on public.business_settings;
create trigger audit_business_settings after insert or update on public.business_settings
  for each row execute function private.record_audit_log();

-- 6. Row Level Security (RLS) Policies

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.business_settings enable row level security;
alter table public.services enable row level security;
alter table public.resources enable row level security;
alter table public.service_resources enable row level security;
alter table public.resource_staff enable row level security;
alter table public.availability_rules enable row level security;
alter table public.time_off enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_notes enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

-- Profiles
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or private.is_admin());
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Admins: allow authenticated users to check if they are in admins (for Login/Route guard before AAL2)
create policy "Users can check own admin status" on public.admins
  for select to authenticated using (user_id = auth.uid() or private.is_admin());

-- Business Settings: public read (branding/storefront/login), admin write
create policy "Public read business_settings" on public.business_settings
  for select to anon, authenticated using (true);
create policy "Admins update business_settings" on public.business_settings
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- Services: public read active services, admin full access
create policy "Public read active services" on public.services
  for select to anon, authenticated using (is_active = true or private.is_admin());
create policy "Admins manage services" on public.services
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Resources: public read active resources, admin full access
create policy "Public read active resources" on public.resources
  for select to anon, authenticated using (is_active = true or private.is_admin());
create policy "Admins manage resources" on public.resources
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Service Resources
create policy "Public read service_resources" on public.service_resources
  for select to anon, authenticated using (true);
create policy "Admins manage service_resources" on public.service_resources
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Resource Staff
create policy "Admins manage resource_staff" on public.resource_staff
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Availability Rules
create policy "Public read availability_rules" on public.availability_rules
  for select to anon, authenticated using (true);
create policy "Admins manage availability_rules" on public.availability_rules
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Time Off
create policy "Admins manage time_off" on public.time_off
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Bookings: strictly admin-only direct table access (public storefront uses security-definer RPCs)
create policy "Admins manage bookings" on public.bookings
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Booking Notes
create policy "Admins manage booking_notes" on public.booking_notes
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Payments: SELECT, INSERT, UPDATE only (no DELETE)
create policy "Admins read payments" on public.payments
  for select to authenticated using (private.is_admin());
create policy "Admins insert payments" on public.payments
  for insert to authenticated with check (private.is_admin());
create policy "Admins update payments" on public.payments
  for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- Audit Log: immutable, SELECT only for admins
create policy "Admins read audit_log" on public.audit_log
  for select to authenticated using (private.is_admin());

-- 7. RPC Functions

-- A. Public Slot Availability Calculator
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_day date,
  p_resource_id uuid default null
)
returns table (
  resource_id uuid,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_settings public.business_settings%rowtype;
  v_duration integer;
  v_weekday integer;
  v_min_start timestamptz;
  v_max_date date;
  v_step interval;
begin
  select * into v_settings from public.business_settings where id = true;
  select duration_minutes into v_duration from public.services where id = p_service_id and is_active = true;
  if v_duration is null then
    return;
  end if;

  v_max_date := ((now() at time zone v_settings.timezone)::date + v_settings.max_advance_days);
  if p_day > v_max_date or p_day < (now() at time zone v_settings.timezone)::date then
    return;
  end if;

  v_min_start := now() + make_interval(mins => v_settings.min_notice_minutes);
  v_weekday := extract(dow from p_day)::integer;
  v_step := make_interval(mins => v_settings.slot_interval_minutes);

  return query
  with candidate_resources as (
    select r.id
    from public.resources r
    join public.service_resources sr on sr.resource_id = r.id
    where sr.service_id = p_service_id
      and r.is_active = true
      and (p_resource_id is null or r.id = p_resource_id)
  ),
  windows as (
    select
      cr.id as res_id,
      (p_day + ar.start_time) at time zone v_settings.timezone as win_start,
      (p_day + ar.end_time) at time zone v_settings.timezone as win_end
    from candidate_resources cr
    join public.availability_rules ar on ar.resource_id = cr.id
    where ar.weekday = v_weekday
  ),
  slots as (
    select
      w.res_id,
      gs as slot_start,
      gs + make_interval(mins => v_duration) as slot_end
    from windows w
    cross join lateral generate_series(
      w.win_start,
      w.win_end - make_interval(mins => v_duration),
      v_step
    ) as gs
    where gs >= v_min_start
  )
  select
    s.res_id as resource_id,
    s.slot_start as starts_at,
    s.slot_end as ends_at
  from slots s
  where not exists (
    select 1 from public.bookings b
    where b.resource_id = s.res_id
      and b.status in ('pending', 'confirmed')
      and (b.status <> 'pending' or b.hold_expires_at > now())
      and b.during && tstzrange(s.slot_start, s.slot_end, '[)')
  )
  and not exists (
    select 1 from public.time_off t
    where t.resource_id = s.res_id
      and t.during && tstzrange(s.slot_start, s.slot_end, '[)')
  )
  order by s.slot_start asc, s.res_id asc;
end;
$$;

grant execute on function public.get_available_slots(uuid, date, uuid) to anon, authenticated;

-- B. Public Customer Booking Creation RPC (Atomic Slot Reservation)
create or replace function public.create_public_booking(
  p_service_id uuid,
  p_resource_id uuid,
  p_starts_at timestamptz,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text default null,
  p_notes text default null
)
returns table (
  id uuid,
  reference text,
  status public.booking_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_minor bigint,
  currency char(3),
  hold_expires_at timestamptz,
  service_name text,
  resource_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.business_settings%rowtype;
  v_service public.services%rowtype;
  v_resource public.resources%rowtype;
  v_ends_at timestamptz;
  v_pending_count integer;
  v_status public.booking_status;
  v_hold_expires timestamptz;
  v_booking public.bookings%rowtype;
begin
  select * into v_settings from public.business_settings where id = true;
  select * into v_service from public.services where id = p_service_id and is_active = true;
  if not found then
    raise exception 'Selected service is unavailable.' using errcode = 'P0001';
  end if;

  select * into v_resource from public.resources where id = p_resource_id and is_active = true;
  if not found then
    raise exception 'Selected specialist or resource is unavailable.' using errcode = 'P0001';
  end if;

  -- Check resource supports service
  if not exists (
    select 1 from public.service_resources sr
    where sr.service_id = p_service_id and sr.resource_id = p_resource_id
  ) then
    raise exception 'Selected specialist does not perform this service.' using errcode = 'P0001';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_minutes);

  -- Enforce minimum notice
  if p_starts_at < now() + make_interval(mins => v_settings.min_notice_minutes) then
    raise exception 'Booking must meet minimum advance notice requirements.' using errcode = 'P0001';
  end if;

  -- Prevent slot hoarding by email
  select count(*) into v_pending_count
  from public.bookings b
  where lower(b.contact_email) = lower(trim(p_contact_email))
    and b.status = 'pending'
    and b.hold_expires_at > now();

  if v_pending_count >= v_settings.max_pending_per_user then
    raise exception 'Maximum active pending reservations reached for this email.' using errcode = 'P0001';
  end if;

  -- Check time off
  if exists (
    select 1 from public.time_off t
    where t.resource_id = p_resource_id
      and t.during && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'The selected specialist is unavailable during this window.' using errcode = '23P01';
  end if;

  -- Expire stale holds on this slot before insert
  update public.bookings b
  set status = 'expired'
  where b.resource_id = p_resource_id
    and b.status = 'pending'
    and b.hold_expires_at <= now()
    and b.during && tstzrange(p_starts_at, v_ends_at, '[)');

  if v_settings.enable_online_payments then
    v_status := 'pending';
    v_hold_expires := now() + make_interval(mins => v_settings.hold_minutes);
  else
    v_status := 'confirmed';
    v_hold_expires := null;
  end if;

  insert into public.bookings (
    customer_id,
    service_id,
    resource_id,
    starts_at,
    ends_at,
    status,
    hold_expires_at,
    price_minor,
    currency,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) values (
    (select auth.uid()),
    p_service_id,
    p_resource_id,
    p_starts_at,
    v_ends_at,
    v_status,
    v_hold_expires,
    v_service.price_minor,
    v_service.currency,
    trim(p_contact_name),
    lower(trim(p_contact_email)),
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into v_booking;

  return query
  select
    v_booking.id,
    v_booking.reference,
    v_booking.status,
    v_booking.starts_at,
    v_booking.ends_at,
    v_booking.price_minor,
    v_booking.currency,
    v_booking.hold_expires_at,
    v_service.name,
    v_resource.name;
end;
$$;

grant execute on function public.create_public_booking(uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

-- C. Public Booking Lookup & Cancellation
create or replace function public.lookup_booking_by_reference(
  p_reference text,
  p_email text
)
returns table (
  id uuid,
  reference text,
  status public.booking_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_minor bigint,
  currency char(3),
  contact_name text,
  contact_email text,
  service_name text,
  resource_name text,
  hold_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.reference,
    b.status,
    b.starts_at,
    b.ends_at,
    b.price_minor,
    b.currency,
    b.contact_name,
    b.contact_email,
    s.name as service_name,
    r.name as resource_name,
    b.hold_expires_at
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.resources r on r.id = b.resource_id
  where upper(b.reference) = upper(trim(p_reference))
    and lower(b.contact_email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.lookup_booking_by_reference(text, text) to anon, authenticated;

create or replace function public.cancel_public_booking(
  p_reference text,
  p_email text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.business_settings%rowtype;
  v_booking public.bookings%rowtype;
begin
  select * into v_settings from public.business_settings where id = true;
  select * into v_booking
  from public.bookings b
  where upper(b.reference) = upper(trim(p_reference))
    and lower(b.contact_email) = lower(trim(p_email))
  for update;

  if not found then
    raise exception 'No matching booking found for that reference and email.' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'This booking can no longer be cancelled.' using errcode = 'P0001';
  end if;

  if v_booking.starts_at < now() + make_interval(hours => v_settings.cancellation_window_hours) then
    raise exception 'Self-cancellation is closed within % hours of appointment start.', v_settings.cancellation_window_hours using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = coalesce(nullif(trim(p_reason), ''), 'Cancelled by customer via storefront'),
      hold_expires_at = null
  where id = v_booking.id;

  return true;
end;
$$;

grant execute on function public.cancel_public_booking(text, text, text) to anon, authenticated;

-- D. Admin Dashboard KPIs
create or replace function public.admin_dashboard_stats(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  bookings_total bigint,
  bookings_confirmed bigint,
  bookings_cancelled bigint,
  revenue_minor bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint as bookings_total,
    count(*) filter (where b.status in ('confirmed', 'completed'))::bigint as bookings_confirmed,
    count(*) filter (where b.status = 'cancelled')::bigint as bookings_cancelled,
    coalesce(sum(b.price_minor) filter (where b.status in ('confirmed', 'completed')), 0)::bigint as revenue_minor
  from public.bookings b
  where b.starts_at >= p_from and b.starts_at < p_to;
end;
$$;

revoke all on function public.admin_dashboard_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard_stats(timestamptz, timestamptz) to authenticated;

-- E. Admin Daily Bookings Chart
create or replace function public.admin_bookings_by_day(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  day date,
  bookings bigint,
  booked_value_minor bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tz text;
begin
  if not (select private.is_admin()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select timezone into v_tz from public.business_settings where id = true;

  return query
  select
    (b.starts_at at time zone v_tz)::date as day,
    count(*)::bigint as bookings,
    coalesce(sum(b.price_minor) filter (where b.status in ('confirmed', 'completed')), 0)::bigint as booked_value_minor
  from public.bookings b
  where b.starts_at >= p_from
    and b.starts_at < p_to
    and b.status in ('pending', 'confirmed', 'completed')
  group by 1
  order by 1;
end;
$$;

revoke all on function public.admin_bookings_by_day(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_bookings_by_day(timestamptz, timestamptz) to authenticated;

-- 8. Realtime & Background Maintenance

alter publication supabase_realtime add table public.bookings, public.payments;

-- Hold Expiry Cleanup Function (invoke via pg_cron every 1 minute in Supabase)
create or replace function private.expire_pending_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
  set status = 'expired'
  where status = 'pending'
    and hold_expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
