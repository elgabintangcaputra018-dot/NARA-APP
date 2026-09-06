import fs from "fs";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface LicenseCode {
  id: string;
  code: string;
  workspace_id: string | null;
  status: "unused" | "active" | "expired";
  plan: "yearly_launching" | "yearly_normal";
  price_paid: number;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface DeviceSession {
  id: string;
  workspace_id: string;
  device_id: string;
  device_name: string;
  last_active_at: string;
  created_at: string;
}

export interface SessionRecord {
  id: string;
  token: string;
  workspace_id: string;
  device_id: string;
  expires_at: string;
  created_at: string;
}

interface LocalDB {
  workspaces: Workspace[];
  license_codes: LicenseCode[];
  device_sessions: DeviceSession[];
  sessions: SessionRecord[];
}

const LOCAL_DB_PATH = path.join(process.cwd(), ".nara-local-db.json");

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("your-project.supabase.co") && !key.includes("your-supabase-"));
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createSupabaseClient(url, key);
}

// Local File DB Helper
function readLocalDB(): LocalDB {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading local db, initializing new:", err);
  }
  const defaultDB: LocalDB = {
    workspaces: [],
    license_codes: [],
    device_sessions: [],
    sessions: [],
  };
  writeLocalDB(defaultDB);
  return defaultDB;
}

function writeLocalDB(data: LocalDB) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving local db:", err);
  }
}

// ==========================================
// DB SERVICE API
// ==========================================

export async function getLicenseByCode(code: string): Promise<LicenseCode | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("license_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();
    if (error && error.code !== "PGRST116") console.error("Supabase getLicenseByCode error:", error);
    return data || null;
  }

  const db = readLocalDB();
  return db.license_codes.find((l) => l.code === normalizedCode) || null;
}

export async function createLicenseCode(data: {
  code: string;
  plan: "yearly_launching" | "yearly_normal";
  price_paid: number;
}): Promise<LicenseCode> {
  const newRecord: LicenseCode = {
    id: crypto.randomUUID(),
    code: data.code.toUpperCase(),
    workspace_id: null,
    status: "unused",
    plan: data.plan,
    price_paid: data.price_paid,
    activated_at: null,
    expires_at: null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("license_codes")
      .insert(newRecord)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  const db = readLocalDB();
  db.license_codes.push(newRecord);
  writeLocalDB(db);
  return newRecord;
}

export async function activateLicense(
  codeId: string,
  workspaceId: string,
  activatedAt: string,
  expiresAt: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("license_codes")
      .update({
        workspace_id: workspaceId,
        status: "active",
        activated_at: activatedAt,
        expires_at: expiresAt,
      })
      .eq("id", codeId);
    if (error) throw new Error(error.message);
    return;
  }

  const db = readLocalDB();
  const idx = db.license_codes.findIndex((l) => l.id === codeId);
  if (idx !== -1) {
    db.license_codes[idx].workspace_id = workspaceId;
    db.license_codes[idx].status = "active";
    db.license_codes[idx].activated_at = activatedAt;
    db.license_codes[idx].expires_at = expiresAt;
    writeLocalDB(db);
  }
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const newWorkspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("workspaces")
      .insert(newWorkspace)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const db = readLocalDB();
  db.workspaces.push(newWorkspace);
  writeLocalDB(db);
  return newWorkspace;
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) console.error("Supabase getWorkspace error:", error);
    return data || null;
  }

  const db = readLocalDB();
  return db.workspaces.find((w) => w.id === id) || null;
}

export async function getWorkspaceLicense(workspaceId: string): Promise<LicenseCode | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("license_codes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error("Supabase getWorkspaceLicense error:", error);
    return data || null;
  }

  const db = readLocalDB();
  return (
    db.license_codes
      .filter((l) => l.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ||
    null
  );
}

export async function getDeviceSessions(workspaceId: string): Promise<DeviceSession[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("device_sessions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("last_active_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalDB();
  return db.device_sessions
    .filter((d) => d.workspace_id === workspaceId)
    .sort((a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime());
}

export async function createDeviceSession(data: {
  workspace_id: string;
  device_id: string;
  device_name: string;
}): Promise<DeviceSession> {
  const newSession: DeviceSession = {
    id: crypto.randomUUID(),
    workspace_id: data.workspace_id,
    device_id: data.device_id,
    device_name: data.device_name,
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("device_sessions")
      .insert(newSession)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  const db = readLocalDB();
  db.device_sessions.push(newSession);
  writeLocalDB(db);
  return newSession;
}

export async function updateDeviceSessionActivity(workspaceId: string, deviceId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("device_sessions")
      .update({ last_active_at: now })
      .eq("workspace_id", workspaceId)
      .eq("device_id", deviceId);
    return;
  }

  const db = readLocalDB();
  const session = db.device_sessions.find(
    (d) => d.workspace_id === workspaceId && d.device_id === deviceId
  );
  if (session) {
    session.last_active_at = now;
    writeLocalDB(db);
  }
}

export async function deleteDeviceSession(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("device_sessions")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initialLen = db.device_sessions.length;
  db.device_sessions = db.device_sessions.filter(
    (d) => !(d.id === id && d.workspace_id === workspaceId)
  );
  const changed = db.device_sessions.length !== initialLen;
  if (changed) writeLocalDB(db);
  return changed;
}

export async function createSession(data: {
  token: string;
  workspace_id: string;
  device_id: string;
  expires_at: string;
}): Promise<SessionRecord> {
  const record: SessionRecord = {
    id: crypto.randomUUID(),
    token: data.token,
    workspace_id: data.workspace_id,
    device_id: data.device_id,
    expires_at: data.expires_at,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("sessions")
      .insert(record)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  const db = readLocalDB();
  // Remove existing session for same token if any
  db.sessions = db.sessions.filter((s) => s.token !== data.token);
  db.sessions.push(record);
  writeLocalDB(db);
  return record;
}

export async function getSession(token: string): Promise<SessionRecord | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) console.error("Supabase getSession error:", error);
    return data || null;
  }

  const db = readLocalDB();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    // Expired
    return null;
  }
  return session;
}

export async function deleteSession(token: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    await supabase.from("sessions").delete().eq("token", token);
    return;
  }

  const db = readLocalDB();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  writeLocalDB(db);
}
