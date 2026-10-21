create table if not exists public.nodal_portal_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.colleges(id) on delete cascade,
  student_id uuid null references public.profiles(id) on delete set null,
  record_type text not null check (record_type in ('assignment','evaluation','document','notification')),
  title text not null check (char_length(trim(title)) between 2 and 180),
  description text null check (char_length(coalesce(description,'')) <= 5000),
  status text not null default 'open' check (status in ('open','in_progress','submitted','completed','published')),
  due_date date null,
  resource_url text null check (resource_url is null or char_length(resource_url) <= 2048),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nodal_portal_records_institution_type_created_idx on public.nodal_portal_records(institution_id, record_type, created_at desc);
create index if not exists nodal_portal_records_student_idx on public.nodal_portal_records(student_id);
alter table public.nodal_portal_records enable row level security;
revoke all on public.nodal_portal_records from anon, authenticated;
grant all on public.nodal_portal_records to service_role;