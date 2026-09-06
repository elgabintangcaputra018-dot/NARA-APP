-- Migration 0006: Notes Module with Full-Text Search, Tags, Links, and Attachments
-- Nara — Indonesian OSN Study Companion App

-- 1. Table notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index search_vector with GIN
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON public.notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON public.notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_search_vector ON public.notes USING GIN(search_vector);

-- Function & Trigger to automatically update tsvector
CREATE OR REPLACE FUNCTION public.notes_search_vector_update()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.content::text, '')), 'B');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notes_search_vector ON public.notes;
CREATE TRIGGER trg_notes_search_vector
BEFORE INSERT OR UPDATE OF title, content ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.notes_search_vector_update();

-- 2. Table note_tags
CREATE TABLE IF NOT EXISTS public.note_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON public.note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON public.note_tags(tag);

-- 3. Table note_links (bi-directional or directed note linking)
CREATE TABLE IF NOT EXISTS public.note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_different_notes CHECK (source_note_id <> target_note_id),
    CONSTRAINT uq_note_links UNIQUE (source_note_id, target_note_id)
);

CREATE INDEX IF NOT EXISTS idx_note_links_source ON public.note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON public.note_links(target_note_id);

-- 4. Table note_attachments
CREATE TABLE IF NOT EXISTS public.note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.study_files(id) ON DELETE CASCADE,
    annotation_id UUID REFERENCES public.annotations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- Policy notes: workspace isolation
CREATE POLICY "workspace_isolation_notes" ON public.notes
    FOR ALL
    USING (workspace_id = public.get_my_workspace_id())
    WITH CHECK (workspace_id = public.get_my_workspace_id());

-- Policy note_tags: through notes workspace
CREATE POLICY "workspace_isolation_note_tags" ON public.note_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_tags.note_id
            AND n.workspace_id = public.get_my_workspace_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_tags.note_id
            AND n.workspace_id = public.get_my_workspace_id()
        )
    );

-- Policy note_links: through notes workspace
CREATE POLICY "workspace_isolation_note_links" ON public.note_links
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_links.source_note_id
            AND n.workspace_id = public.get_my_workspace_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_links.source_note_id
            AND n.workspace_id = public.get_my_workspace_id()
        )
    );

-- Policy note_attachments: through notes workspace
CREATE POLICY "workspace_isolation_note_attachments" ON public.note_attachments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_attachments.note_id
            AND n.workspace_id = public.get_my_workspace_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = note_attachments.note_id
            AND n.workspace_id = public.get_my_workspace_id()
        )
    );
