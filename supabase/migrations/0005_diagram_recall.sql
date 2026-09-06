-- ==============================================================================
-- NARA APP — Migration 0005: Diagram Active Recall & Label Masking
-- ==============================================================================

-- 1. Table: diagram_labels
CREATE TABLE IF NOT EXISTS public.diagram_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.study_files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  area_x FLOAT NOT NULL CHECK (area_x >= 0.0 AND area_x <= 1.0),
  area_y FLOAT NOT NULL CHECK (area_y >= 0.0 AND area_y <= 1.0),
  area_width FLOAT NOT NULL CHECK (area_width > 0.0 AND area_width <= 1.0),
  area_height FLOAT NOT NULL CHECK (area_height > 0.0 AND area_height <= 1.0),
  label_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for diagram_labels
CREATE INDEX IF NOT EXISTS idx_diagram_labels_file_page ON public.diagram_labels(file_id, page_number);
CREATE INDEX IF NOT EXISTS idx_diagram_labels_workspace_id ON public.diagram_labels(workspace_id);

-- Enable RLS on diagram_labels
ALTER TABLE public.diagram_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace isolation
CREATE POLICY "workspace_isolation_diagram_labels" ON public.diagram_labels
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id())
  WITH CHECK (workspace_id = public.get_my_workspace_id());


-- 2. Table: recall_attempts
CREATE TABLE IF NOT EXISTS public.recall_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  diagram_label_id UUID NOT NULL REFERENCES public.diagram_labels(id) ON DELETE CASCADE,
  correct BOOLEAN NOT NULL,
  user_answer TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for recall_attempts
CREATE INDEX IF NOT EXISTS idx_recall_attempts_label_id ON public.recall_attempts(diagram_label_id);
CREATE INDEX IF NOT EXISTS idx_recall_attempts_workspace_id ON public.recall_attempts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recall_attempts_attempted_at ON public.recall_attempts(attempted_at DESC);

-- Enable RLS on recall_attempts
ALTER TABLE public.recall_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace isolation
CREATE POLICY "workspace_isolation_recall_attempts" ON public.recall_attempts
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id())
  WITH CHECK (workspace_id = public.get_my_workspace_id());
