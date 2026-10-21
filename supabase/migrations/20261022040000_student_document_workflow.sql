alter table public.profiles
  add column if not exists father_name text,
  add column if not exists mother_name text,
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists address text;

alter table public.internship_attendance
  add column if not exists hours numeric(5,2) null check (hours is null or (hours >= 0 and hours <= 24));

create table if not exists public.internship_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  institution_id uuid not null references public.colleges(id) on delete cascade,
  evaluator_id uuid not null references auth.users(id),
  technical_knowledge numeric(5,2) null check (technical_knowledge between 0 and 20),
  quality_of_work numeric(5,2) null check (quality_of_work between 0 and 20),
  initiative_problem_solving numeric(5,2) null check (initiative_problem_solving between 0 and 20),
  communication_skills numeric(5,2) null check (communication_skills between 0 and 20),
  discipline_professionalism numeric(5,2) null check (discipline_professionalism between 0 and 20),
  supervisor_remarks text null,
  status text not null default 'draft' check (status in ('draft','submitted','approved')),
  evaluated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists internship_evaluations_student_idx on public.internship_evaluations(student_id, created_at desc);
alter table public.internship_evaluations enable row level security;
revoke all on public.internship_evaluations from anon, authenticated;
grant all on public.internship_evaluations to service_role;
