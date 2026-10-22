-- Complete the student application workflow while preserving existing application/payment relationships.
create sequence if not exists public.internship_application_number_seq;

alter table public.internship_applications alter column internship_id drop not null;

alter table public.internship_applications
  add column if not exists application_number text,
  add column if not exists college_id uuid references public.colleges(id) on delete set null,
  add column if not exists sector_id uuid references public.sectors(id) on delete set null,
  add column if not exists mode text,
  add column if not exists requested_hours integer not null default 120,
  add column if not exists requested_credits integer not null default 4,
  add column if not exists preferred_start_date date,
  add column if not exists preferred_end_date date,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists pin_code text,
  add column if not exists full_address text,
  add column if not exists nodal_review_status text not null default 'pending',
  add column if not exists review_remarks text,
  add column if not exists declarations jsonb not null default '[]'::jsonb;

alter table public.internship_applications
  alter column application_number set default
  ('SHX-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.internship_application_number_seq')::text, 6, '0'));

update public.internship_applications
set application_number = 'SHX-' || to_char(applied_at, 'YYYY') || '-' ||
  lpad(nextval('public.internship_application_number_seq')::text, 6, '0')
where application_number is null;

create unique index if not exists internship_applications_application_number_uidx
  on public.internship_applications(application_number);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'internship_applications_mode_check') then
    alter table public.internship_applications add constraint internship_applications_mode_check
      check (mode is null or mode in ('onsite','hybrid','remote'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'internship_applications_hours_check') then
    alter table public.internship_applications add constraint internship_applications_hours_check
      check (requested_hours = 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'internship_applications_credits_check') then
    alter table public.internship_applications add constraint internship_applications_credits_check
      check (requested_credits = 4);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'internship_applications_nodal_status_check') then
    alter table public.internship_applications add constraint internship_applications_nodal_status_check
      check (nodal_review_status in ('pending','under_review','approved','rejected'));
  end if;
end $$;

alter table public.profiles
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pin_code text;

alter table public.portal_documents drop constraint if exists portal_documents_status_check;
alter table public.portal_documents add constraint portal_documents_status_check
  check (status = any (array['draft','issued','revoked','pending','verified','rejected']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-documents','student-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;
