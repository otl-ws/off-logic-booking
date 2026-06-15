-- ============================================================================
--  Booking platform — database schema (run this in Supabase → SQL Editor)
-- ============================================================================
--  Paste this whole file into the Supabase SQL Editor and click "Run".
--  It creates the tables, the anti-double-booking guarantees, and three
--  functions the app calls. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  niche        text not null,            -- 'restaurant' | 'medical' | 'beauty'
  resource     text,                     -- practitioner/specialist; NULL for restaurant
  booking_date date not null,
  time_slot    text not null,            -- stored exactly as the app sends it ('7:00','09:00')
  notes        text,
  contact      text not null,            -- email or Kuwait mobile
  party_size   int,
  created_at   timestamptz not null default now()
);

-- Backstop against double-booking an exclusive resource (medical/beauty):
-- the database itself refuses a second row for the same resource+date+time.
create unique index if not exists uniq_exclusive_slot
  on bookings (niche, resource, booking_date, time_slot)
  where resource is not null;

create index if not exists idx_bookings_lookup
  on bookings (niche, booking_date);

create table if not exists suggestions (
  id         uuid primary key default gen_random_uuid(),
  niche      text not null,
  name       text,
  message    text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Turn RLS on and add NO policies. That means the public/anon key cannot read
-- or write these tables directly. The only way in is the SECURITY DEFINER
-- functions below — so customers can book, but nobody can read anyone else's
-- contact details or notes from the browser.
alter table bookings    enable row level security;
alter table suggestions enable row level security;

-- ----------------------------------------------------------------------------
-- FUNCTION: get_availability  — aggregate counts only, no personal data
-- ----------------------------------------------------------------------------
create or replace function get_availability(p_niche text)
returns table(resource text, slot_date text, slot_time text, taken int)
language sql
security definer
set search_path = public
as $$
  select coalesce(b.resource, '') as resource,
         b.booking_date::text     as slot_date,
         b.time_slot              as slot_time,
         count(*)::int            as taken
  from bookings b
  where b.niche = p_niche
    and b.booking_date >= current_date
  group by b.resource, b.booking_date, b.time_slot;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: create_booking  — atomic check-and-insert (the important one)
-- ----------------------------------------------------------------------------
-- An advisory lock keyed on the exact slot serialises any two requests racing
-- for the same slot, so the count-then-insert can't be undercut. The
-- availability rule is resolved server-side (not trusted from the client).
create or replace function create_booking(
  p_niche text, p_resource text, p_date date, p_time text,
  p_notes text, p_contact text, p_party int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode     text;
  v_per_slot int;
  v_count    int;
begin
  if p_niche = 'restaurant' then
    v_mode := 'capacity'; v_per_slot := 6;
  elsif p_niche in ('medical', 'beauty') then
    v_mode := 'exclusive';
  else
    return jsonb_build_object('ok', false, 'reason', 'unknown_niche');
  end if;

  if p_contact is null or length(trim(p_contact)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_contact');
  end if;

  -- serialise concurrent attempts on this exact slot
  perform pg_advisory_xact_lock(
    hashtext(p_niche || '|' || coalesce(p_resource, '') || '|' || p_date::text || '|' || p_time)
  );

  if v_mode = 'exclusive' then
    select count(*) into v_count from bookings
      where niche = p_niche and resource = p_resource
        and booking_date = p_date and time_slot = p_time;
    if v_count > 0 then
      return jsonb_build_object('ok', false, 'reason', 'taken');
    end if;
  else
    select count(*) into v_count from bookings
      where niche = p_niche and booking_date = p_date and time_slot = p_time;
    if v_count >= v_per_slot then
      return jsonb_build_object('ok', false, 'reason', 'full');
    end if;
  end if;

  insert into bookings (niche, resource, booking_date, time_slot, notes, contact, party_size)
    values (p_niche, p_resource, p_date, p_time,
            nullif(trim(coalesce(p_notes, '')), ''), p_contact, p_party);

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'taken');
end;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: add_suggestion
-- ----------------------------------------------------------------------------
create or replace function add_suggestion(p_niche text, p_name text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_message is null or length(trim(p_message)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  insert into suggestions (niche, name, message)
    values (p_niche, nullif(trim(coalesce(p_name, '')), ''), trim(p_message));
  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- GRANTS — only these functions are callable by the public (anon) key
-- ----------------------------------------------------------------------------
revoke all on function get_availability(text)                         from public;
revoke all on function create_booking(text,text,date,text,text,text,int) from public;
revoke all on function add_suggestion(text,text,text)                 from public;

grant execute on function get_availability(text)                         to anon, authenticated;
grant execute on function create_booking(text,text,date,text,text,text,int) to anon, authenticated;
grant execute on function add_suggestion(text,text,text)                 to anon, authenticated;

-- ----------------------------------------------------------------------------
-- OPTIONAL SEED — makes some slots show as taken on first load (like the demo).
-- Delete this block if you want a clean board. Safe to skip.
-- ----------------------------------------------------------------------------
-- Restaurant: fill today's 7:00 (cap 6) and partly fill 7:30.
insert into bookings (niche, resource, booking_date, time_slot, contact)
select 'restaurant', null, current_date, '7:00', 'seed@example.com' from generate_series(1, 6);
insert into bookings (niche, resource, booking_date, time_slot, contact)
select 'restaurant', null, current_date, '7:30', 'seed@example.com' from generate_series(1, 4);
-- Medical / beauty: a couple of exclusive holds.
insert into bookings (niche, resource, booking_date, time_slot, contact) values
  ('medical', 'Dr. Haddad', current_date, '09:00', 'seed@example.com'),
  ('medical', 'Dr. Haddad', current_date, '10:00', 'seed@example.com'),
  ('beauty',  'Lina',       current_date, '11:00', 'seed@example.com'),
  ('beauty',  'Mariam',     current_date, '14:00', 'seed@example.com')
on conflict do nothing;
