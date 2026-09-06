-- 0007_syllabus.sql
-- Modul Silabus & Auto-Jadwal (Syllabus & Algorithmic Auto-Scheduler)

-- 1. Table: syllabi
create table if not exists public.syllabi (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  file_id uuid references public.study_files(id) on delete set null,
  title text not null,
  deadline timestamptz,
  created_at timestamptz not null default now()
);

-- Index for workspace lookup
create index if not exists idx_syllabi_workspace on public.syllabi(workspace_id);
create index if not exists idx_syllabi_subject on public.syllabi(subject_id);

-- 2. Table: syllabus_topics
create table if not exists public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.syllabi(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  weight integer not null default 3 check (weight between 1 and 5),
  estimated_minutes integer not null default 60,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed'))
);

-- Index for syllabus topics
create index if not exists idx_syllabus_topics_syllabus on public.syllabus_topics(syllabus_id);
create index if not exists idx_syllabus_topics_status on public.syllabus_topics(status);

-- 3. Enhance study_sessions with topic_id (optional link to syllabus_topics)
alter table public.study_sessions 
add column if not exists topic_id uuid references public.syllabus_topics(id) on delete set null;

create index if not exists idx_study_sessions_topic on public.study_sessions(topic_id);

-- 4. Enable Row Level Security (RLS)
alter table public.syllabi enable row level security;
alter table public.syllabus_topics enable row level security;

-- Syllabi policies
drop policy if exists "Workspaces can manage their own syllabi" on public.syllabi;
create policy "Workspaces can manage their own syllabi"
  on public.syllabi for all
  using (workspace_id = auth.uid() or workspace_id is not null)
  with check (workspace_id = auth.uid() or workspace_id is not null);

-- Syllabus Topics policies
drop policy if exists "Workspaces can manage topics of their syllabi" on public.syllabus_topics;
create policy "Workspaces can manage topics of their syllabi"
  on public.syllabus_topics for all
  using (
    syllabus_id in (
      select id from public.syllabi 
      where workspace_id = auth.uid() or workspace_id is not null
    )
  )
  with check (
    syllabus_id in (
      select id from public.syllabi 
      where workspace_id = auth.uid() or workspace_id is not null
    )
  );
