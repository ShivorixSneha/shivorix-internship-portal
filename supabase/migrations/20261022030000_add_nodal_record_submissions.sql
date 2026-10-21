create table if not exists public.nodal_record_submissions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.nodal_portal_records(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_url text null check (submission_url is null or char_length(submission_url) <= 2048),
  submission_note text null check (char_length(coalesce(submission_note,'')) <= 5000),
  status text not null default 'submitted' check (status in ('submitted','reviewed','accepted','revision_requested')),
  feedback text null check (char_length(coalesce(feedback,'')) <= 5000),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(record_id, student_id)
);
create index if not exists nodal_record_submissions_student_idx on public.nodal_record_submissions(student_id, submitted_at desc);
create index if not exists nodal_record_submissions_record_idx on public.nodal_record_submissions(record_id, submitted_at desc);
alter table public.nodal_record_submissions enable row level security;
revoke all on public.nodal_record_submissions from anon, authenticated;
grant all on public.nodal_record_submissions to service_role;