-- ==============================================================================
-- NARA APP — Migration 0004: Study Files, Offline Annotations & Storage
-- ==============================================================================

-- 1. Table: study_files
CREATE TABLE IF NOT EXISTS public.study_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image')),
  storage_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying files by workspace
CREATE INDEX IF NOT EXISTS idx_study_files_workspace_id ON public.study_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_study_files_uploaded_at ON public.study_files(uploaded_at DESC);

-- Enable RLS on study_files
ALTER TABLE public.study_files ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace isolation
CREATE POLICY "workspace_isolation_study_files" ON public.study_files
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id())
  WITH CHECK (workspace_id = public.get_my_workspace_id());


-- 2. Table: annotations
CREATE TABLE IF NOT EXISTS public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.study_files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  stroke_type TEXT NOT NULL CHECK (stroke_type IN ('freehand', 'highlight', 'circle', 'arrow', 'text')),
  svg_path TEXT NOT NULL,
  color TEXT NOT NULL,
  stroke_width INTEGER NOT NULL DEFAULT 3,
  layer_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('synced', 'pending', 'conflict')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotations_file_page ON public.annotations(file_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_workspace_id ON public.annotations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_annotations_updated_at ON public.annotations(updated_at DESC);

-- Enable RLS on annotations
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace isolation
CREATE POLICY "workspace_isolation_annotations" ON public.annotations
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id())
  WITH CHECK (workspace_id = public.get_my_workspace_id());


-- 3. Supabase Storage Bucket & Policies: study-files
-- Create private bucket 'study-files' if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'study-files',
      'study-files',
      false,
      52428800, -- 50MB limit
      ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO NOTHING;

    -- Enable RLS on storage.objects if not already enabled
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any to avoid duplication
    DROP POLICY IF EXISTS "workspace_isolation_storage_select" ON storage.objects;
    DROP POLICY IF EXISTS "workspace_isolation_storage_insert" ON storage.objects;
    DROP POLICY IF EXISTS "workspace_isolation_storage_update" ON storage.objects;
    DROP POLICY IF EXISTS "workspace_isolation_storage_delete" ON storage.objects;

    -- Storage isolation policies based on folder prefix matching user's workspace_id
    CREATE POLICY "workspace_isolation_storage_select" ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'study-files' AND
        (storage.foldername(name))[1] = public.get_my_workspace_id()::text
      );

    CREATE POLICY "workspace_isolation_storage_insert" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'study-files' AND
        (storage.foldername(name))[1] = public.get_my_workspace_id()::text
      );

    CREATE POLICY "workspace_isolation_storage_update" ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'study-files' AND
        (storage.foldername(name))[1] = public.get_my_workspace_id()::text
      );

    CREATE POLICY "workspace_isolation_storage_delete" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'study-files' AND
        (storage.foldername(name))[1] = public.get_my_workspace_id()::text
      );
  END IF;
END $$;
