-- ============================================================================
-- Digi Aura — Supabase schema for the contact enquiry form
-- Run this whole file once in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run: it uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================================

-- 1. Table -------------------------------------------------------------------
create table if not exists public.enquiries (
  id                    uuid        primary key default gen_random_uuid(),
  full_name             text        not null,
  company_name          text,
  email                 text        not null,
  phone                 text        not null,
  service_interested_in text        not null,
  message               text        not null,
  created_at            timestamptz not null default now(),

  -- Last line of defence: the database rejects bad data even if someone
  -- bypasses the browser form and calls the API directly.
  constraint enquiries_full_name_len check (char_length(btrim(full_name)) between 2 and 100),
  constraint enquiries_company_len   check (company_name is null or char_length(company_name) <= 120),
  constraint enquiries_email_format  check (
    char_length(email) between 5 and 254
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
  ),
  constraint enquiries_phone_format  check (phone ~ '^[0-9+() -]{7,20}$'),
  constraint enquiries_service_len   check (char_length(service_interested_in) between 1 and 100),
  constraint enquiries_message_len   check (char_length(btrim(message)) between 10 and 2000)
);

comment on table public.enquiries is 'Website contact form submissions (insert-only for anonymous visitors).';

-- 2. Row Level Security ---------------------------------------------------------
alter table public.enquiries enable row level security;

-- 3. Privileges: anonymous visitors may INSERT only ----------------------------------
revoke all on table public.enquiries from anon, authenticated;
grant  insert on table public.enquiries to anon;
-- No SELECT, UPDATE or DELETE is granted, and no policy exists for them.

-- 4. Narrowly scoped INSERT policy -------------------------------------------------
-- Keep the service list in sync with the <select> in contact.html.
drop policy if exists "Anonymous visitors can submit enquiries" on public.enquiries;

create policy "Anonymous visitors can submit enquiries"
  on public.enquiries
  for insert
  to anon
  with check (
    char_length(btrim(full_name)) between 2 and 100
    and (company_name is null or char_length(company_name) <= 120)
    and char_length(email) between 5 and 254
    and phone ~ '^[0-9+() -]{7,20}$'
    and char_length(btrim(message)) between 10 and 2000
    and service_interested_in in (
      'General enquiry',
      'Lead Generation',
      'Performance Marketing',
      'Website Development',
      'SEO & Google Ranking',
      'Branding & Creative Solutions',
      'Social Media Marketing',
      'Google Business Profile Optimization',
      'WhatsApp, Email & SMS Marketing',
      'Business Growth Consultation',
      'Recruitment Lead Generation'
    )
    and created_at <= now() + interval '1 minute'   -- visitors cannot back-date or future-date rows
  );

-- 5. Reading enquiries ---------------------------------------------------------------
-- You (the project owner) read enquiries in Dashboard > Table Editor, which bypasses RLS.
-- Do NOT add a public SELECT policy. If you later build an admin page, use Supabase Auth
-- and a policy limited to your own user, for example:
--   create policy "Admin can read enquiries" on public.enquiries
--     for select to authenticated using (auth.uid() = '<your-user-uuid>');
