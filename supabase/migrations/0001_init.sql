-- ==============================================================================
-- NARA APP — MIGRATION 0001: INITIAL SCHEMA (WORKSPACES & PROFILES)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY, -- can reference auth.users(id) if Supabase Auth is enabled
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'siswa' CHECK (role IN ('admin', 'pembina', 'siswa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function: get_my_workspace_id() based on auth.uid()
CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for workspaces
CREATE POLICY "Users can access their own workspace"
  ON public.workspaces
  FOR ALL
  USING (id = public.get_my_workspace_id());

-- Policies for profiles
CREATE POLICY "Users can access profiles in their own workspace"
  ON public.profiles
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

-- Trigger function: auto-create workspace and admin profile on new user registration (if auth.users exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Workspace Siswa'))
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.profiles (id, workspace_id, full_name, role)
  VALUES (
    NEW.id,
    new_workspace_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Siswa OSN'),
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition for auth.users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
