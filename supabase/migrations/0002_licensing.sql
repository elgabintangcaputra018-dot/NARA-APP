-- ==============================================================================
-- NARA APP — MIGRATION 0002: LICENSING & MULTI-DEVICE SESSIONS
-- ==============================================================================

-- Table: license_codes
CREATE TABLE IF NOT EXISTS public.license_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'expired')),
  plan TEXT NOT NULL CHECK (plan IN ('yearly_launching', 'yearly_normal')),
  price_paid INTEGER NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on code for fast lookup
CREATE INDEX IF NOT EXISTS idx_license_codes_code ON public.license_codes(code);
CREATE INDEX IF NOT EXISTS idx_license_codes_workspace_id ON public.license_codes(workspace_id);

-- Table: device_sessions
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_device UNIQUE (workspace_id, device_id)
);

-- Index on workspace and device
CREATE INDEX IF NOT EXISTS idx_device_sessions_workspace ON public.device_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON public.device_sessions(device_id);

-- Table: sessions (for custom session token management)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON public.sessions(workspace_id);

-- Enable RLS
ALTER TABLE public.license_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Policies: workspace members can only view their own device_sessions and license_codes
CREATE POLICY "Users can access device_sessions of own workspace"
  ON public.device_sessions
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "Users can access license_codes of own workspace"
  ON public.license_codes
  FOR SELECT
  USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "Users can access sessions of own workspace"
  ON public.sessions
  FOR ALL
  USING (workspace_id = public.get_my_workspace_id());
