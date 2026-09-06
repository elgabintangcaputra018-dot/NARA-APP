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

export interface Subject {
  id: string;
  workspace_id: string;
  name: string;
  priority: "very_high" | "high" | "medium" | "low" | "very_low";
  mode: "intensive" | "moderate" | "deadline_crunch";
  color: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  workspace_id: string;
  subject_id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  source: "manual" | "auto_generated";
  calendar_event_id: string | null;
  created_at: string;
  subject?: Subject;
}

export interface CalendarConnection {
  id: string;
  workspace_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  sync_mode: "two_way" | "read_only";
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyFile {
  id: string;
  workspace_id: string;
  file_name: string;
  file_type: "pdf" | "image";
  storage_path: string;
  file_size: number;
  uploaded_at: string;
}

export interface AnnotationRecord {
  id: string;
  workspace_id: string;
  file_id: string;
  page_number: number;
  stroke_type: "freehand" | "highlight" | "circle" | "arrow" | "text";
  svg_path: string;
  color: string;
  stroke_width: number;
  layer_visible: boolean;
  sync_status: "synced" | "pending" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface DiagramLabel {
  id: string;
  workspace_id: string;
  file_id: string;
  page_number: number;
  area_x: number;
  area_y: number;
  area_width: number;
  area_height: number;
  label_text: string;
  created_at: string;
}

export interface RecallAttempt {
  id: string;
  workspace_id: string;
  diagram_label_id: string;
  correct: boolean;
  user_answer?: string;
  attempted_at: string;
}

export interface Note {
  id: string;
  workspace_id: string;
  subject_id: string | null;
  title: string;
  content: Record<string, unknown> | string | null; // jsonb tiptap doc
  search_vector?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
  tags?: string[];
  links_count?: number;
  attachments_count?: number;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag: string;
  created_at: string;
}

export interface NoteLink {
  id: string;
  source_note_id: string;
  target_note_id: string;
  created_at: string;
  target_title?: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  file_id: string | null;
  annotation_id: string | null;
  created_at: string;
  file?: StudyFile | null;
}

interface LocalDB {
  workspaces: Workspace[];
  license_codes: LicenseCode[];
  device_sessions: DeviceSession[];
  sessions: SessionRecord[];
  subjects: Subject[];
  study_sessions: StudySession[];
  calendar_connections: CalendarConnection[];
  study_files: StudyFile[];
  annotations: AnnotationRecord[];
  diagram_labels: DiagramLabel[];
  recall_attempts: RecallAttempt[];
  notes: Note[];
  note_tags: NoteTag[];
  note_links: NoteLink[];
  note_attachments: NoteAttachment[];
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
  const defaultDB: LocalDB = {
    workspaces: [],
    license_codes: [],
    device_sessions: [],
    sessions: [],
    subjects: [],
    study_sessions: [],
    calendar_connections: [],
    study_files: [],
    annotations: [],
    diagram_labels: [],
    recall_attempts: [],
    notes: [],
    note_tags: [],
    note_links: [],
    note_attachments: [],
  };

  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
      const parsed = JSON.parse(data);
      return {
        workspaces: parsed.workspaces || [],
        license_codes: parsed.license_codes || [],
        device_sessions: parsed.device_sessions || [],
        sessions: parsed.sessions || [],
        subjects: parsed.subjects || [],
        study_sessions: parsed.study_sessions || [],
        calendar_connections: parsed.calendar_connections || [],
        study_files: parsed.study_files || [],
        annotations: parsed.annotations || [],
        diagram_labels: parsed.diagram_labels || [],
        recall_attempts: parsed.recall_attempts || [],
        notes: parsed.notes || [],
        note_tags: parsed.note_tags || [],
        note_links: parsed.note_links || [],
        note_attachments: parsed.note_attachments || [],
      };
    }
  } catch (err) {
    console.error("Gagal membaca local db, inisialisasi ulang:", err);
  }

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

// ==========================================
// SUBJECTS API
// ==========================================

export async function getSubjects(workspaceId: string): Promise<Subject[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalDB();
  return db.subjects
    .filter((s) => s.workspace_id === workspaceId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createSubject(data: {
  workspace_id: string;
  name: string;
  priority: "very_high" | "high" | "medium" | "low" | "very_low";
  mode: "intensive" | "moderate" | "deadline_crunch";
  color: string;
}): Promise<Subject> {
  const newSubject: Subject = {
    id: crypto.randomUUID(),
    workspace_id: data.workspace_id,
    name: data.name,
    priority: data.priority,
    mode: data.mode,
    color: data.color || "#6B95F1",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("subjects")
      .insert(newSubject)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  const db = readLocalDB();
  db.subjects.push(newSubject);
  writeLocalDB(db);
  return newSubject;
}

export async function updateSubject(
  id: string,
  workspaceId: string,
  data: Partial<Omit<Subject, "id" | "workspace_id" | "created_at">>
): Promise<Subject | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from("subjects")
      .update(data)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return updated || null;
  }

  const db = readLocalDB();
  const idx = db.subjects.findIndex((s) => s.id === id && s.workspace_id === workspaceId);
  if (idx === -1) return null;
  db.subjects[idx] = { ...db.subjects[idx], ...data };
  writeLocalDB(db);
  return db.subjects[idx];
}

export async function deleteSubject(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const prevLen = db.subjects.length;
  db.subjects = db.subjects.filter((s) => !(s.id === id && s.workspace_id === workspaceId));
  // Also delete associated study sessions (cascade)
  db.study_sessions = db.study_sessions.filter((sess) => !(sess.subject_id === id && sess.workspace_id === workspaceId));
  const changed = db.subjects.length !== prevLen;
  if (changed) writeLocalDB(db);
  return changed;
}

// ==========================================
// STUDY SESSIONS API
// ==========================================

export async function getStudySessions(
  workspaceId: string,
  startDate?: string,
  endDate?: string
): Promise<StudySession[]> {
  const subjects = await getSubjects(workspaceId);
  const subjectsMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("study_sessions")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (startDate) query = query.gte("start_time", startDate);
    if (endDate) query = query.lte("start_time", endDate);

    const { data, error } = await query.order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map((session) => ({
      ...session,
      subject: subjectsMap.get(session.subject_id),
    }));
  }

  const db = readLocalDB();
  let sessions = db.study_sessions.filter((s) => s.workspace_id === workspaceId);
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    sessions = sessions.filter((s) => new Date(s.start_time).getTime() >= startMs);
  }
  if (endDate) {
    const endMs = new Date(endDate).getTime();
    sessions = sessions.filter((s) => new Date(s.start_time).getTime() <= endMs);
  }

  return sessions
    .map((s) => ({ ...s, subject: subjectsMap.get(s.subject_id) }))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export async function createStudySession(data: {
  workspace_id: string;
  subject_id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status?: "planned" | "in_progress" | "completed" | "cancelled";
  source?: "manual" | "auto_generated";
  calendar_event_id?: string | null;
}): Promise<StudySession> {
  const newSession: StudySession = {
    id: crypto.randomUUID(),
    workspace_id: data.workspace_id,
    subject_id: data.subject_id,
    title: data.title,
    start_time: data.start_time,
    duration_minutes: data.duration_minutes || 60,
    status: data.status || "planned",
    source: data.source || "manual",
    calendar_event_id: data.calendar_event_id || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from("study_sessions")
      .insert(newSession)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  }

  const db = readLocalDB();
  db.study_sessions.push(newSession);
  writeLocalDB(db);
  return newSession;
}

export async function updateStudySession(
  id: string,
  workspaceId: string,
  data: Partial<Omit<StudySession, "id" | "workspace_id" | "created_at" | "subject">>
): Promise<StudySession | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from("study_sessions")
      .update(data)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return updated || null;
  }

  const db = readLocalDB();
  const idx = db.study_sessions.findIndex((s) => s.id === id && s.workspace_id === workspaceId);
  if (idx === -1) return null;
  db.study_sessions[idx] = { ...db.study_sessions[idx], ...data };
  writeLocalDB(db);
  return db.study_sessions[idx];
}

export async function deleteStudySession(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("study_sessions")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const prevLen = db.study_sessions.length;
  db.study_sessions = db.study_sessions.filter((s) => !(s.id === id && s.workspace_id === workspaceId));
  const changed = db.study_sessions.length !== prevLen;
  if (changed) writeLocalDB(db);
  return changed;
}

// ==========================================
// CALENDAR CONNECTIONS API
// ==========================================

export async function getCalendarConnection(workspaceId: string): Promise<CalendarConnection | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error && error.code !== "PGRST116") console.error("Supabase getCalendarConnection error:", error);
    return data || null;
  }

  const db = readLocalDB();
  return db.calendar_connections.find((c) => c.workspace_id === workspaceId) || null;
}

export async function saveCalendarConnection(data: {
  workspace_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  sync_mode?: "two_way" | "read_only";
}): Promise<CalendarConnection> {
  const now = new Date().toISOString();
  const record: CalendarConnection = {
    id: crypto.randomUUID(),
    workspace_id: data.workspace_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    sync_mode: data.sync_mode || "two_way",
    is_connected: true,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: upserted, error } = await supabase
      .from("calendar_connections")
      .upsert(record, { onConflict: "workspace_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return upserted;
  }

  const db = readLocalDB();
  const idx = db.calendar_connections.findIndex((c) => c.workspace_id === data.workspace_id);
  if (idx !== -1) {
    db.calendar_connections[idx] = {
      ...db.calendar_connections[idx],
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      sync_mode: data.sync_mode || db.calendar_connections[idx].sync_mode,
      is_connected: true,
      updated_at: now,
    };
    writeLocalDB(db);
    return db.calendar_connections[idx];
  }

  db.calendar_connections.push(record);
  writeLocalDB(db);
  return record;
}

export async function updateCalendarSettings(
  workspaceId: string,
  data: { sync_mode?: "two_way" | "read_only"; is_connected?: boolean }
): Promise<CalendarConnection | null> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from("calendar_connections")
      .update({ ...data, updated_at: now })
      .eq("workspace_id", workspaceId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return updated || null;
  }

  const db = readLocalDB();
  const idx = db.calendar_connections.findIndex((c) => c.workspace_id === workspaceId);
  if (idx === -1) return null;
  db.calendar_connections[idx] = {
    ...db.calendar_connections[idx],
    ...data,
    updated_at: now,
  };
  writeLocalDB(db);
  return db.calendar_connections[idx];
}

export async function disconnectCalendar(workspaceId: string): Promise<boolean> {
  return (await updateCalendarSettings(workspaceId, { is_connected: false })) !== null;
}

// ==========================================
// STUDY FILES API
// ==========================================

export async function getStudyFiles(workspaceId: string): Promise<StudyFile[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("study_files")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("uploaded_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalDB();
  return (db.study_files || [])
    .filter((f) => f.workspace_id === workspaceId)
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
}

export async function getStudyFileById(id: string, workspaceId: string): Promise<StudyFile | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("study_files")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }

  const db = readLocalDB();
  return (db.study_files || []).find((f) => f.id === id && f.workspace_id === workspaceId) || null;
}

export async function createStudyFile(data: {
  workspace_id: string;
  file_name: string;
  file_type: "pdf" | "image";
  storage_path: string;
  file_size?: number;
}): Promise<StudyFile> {
  const fileRecord: StudyFile = {
    id: `file_${crypto.randomUUID()}`,
    workspace_id: data.workspace_id,
    file_name: data.file_name,
    file_type: data.file_type,
    storage_path: data.storage_path,
    file_size: data.file_size || 0,
    uploaded_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase
      .from("study_files")
      .insert({
        workspace_id: fileRecord.workspace_id,
        file_name: fileRecord.file_name,
        file_type: fileRecord.file_type,
        storage_path: fileRecord.storage_path,
        file_size: fileRecord.file_size,
        uploaded_at: fileRecord.uploaded_at,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.study_files) db.study_files = [];
  db.study_files.push(fileRecord);
  writeLocalDB(db);
  return fileRecord;
}

export async function deleteStudyFile(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("study_files")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLength = (db.study_files || []).length;
  db.study_files = (db.study_files || []).filter((f) => !(f.id === id && f.workspace_id === workspaceId));
  // Cascade delete annotations
  db.annotations = (db.annotations || []).filter((a) => a.file_id !== id);
  writeLocalDB(db);
  return db.study_files.length < initLength;
}

// ==========================================
// ANNOTATIONS API
// ==========================================

export async function getAnnotationsByFile(
  fileId: string,
  workspaceId: string,
  pageNumber?: number
): Promise<AnnotationRecord[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("annotations")
      .select("*")
      .eq("file_id", fileId)
      .eq("workspace_id", workspaceId);
    if (typeof pageNumber === "number") {
      query = query.eq("page_number", pageNumber);
    }
    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalDB();
  return (db.annotations || []).filter((a) => {
    if (a.file_id !== fileId || a.workspace_id !== workspaceId) return false;
    if (typeof pageNumber === "number" && a.page_number !== pageNumber) return false;
    return true;
  });
}

export async function upsertAnnotationsBatch(
  workspaceId: string,
  fileId: string,
  items: Array<
    Partial<AnnotationRecord> & {
      id: string;
      svg_path: string;
      stroke_type: "freehand" | "highlight" | "circle" | "arrow" | "text";
      color: string;
      stroke_width: number;
      page_number?: number;
    }
  >
): Promise<AnnotationRecord[]> {
  const now = new Date().toISOString();
  const sanitizedItems: AnnotationRecord[] = items.map((item) => ({
    id: item.id || `anno_${crypto.randomUUID()}`,
    workspace_id: workspaceId,
    file_id: fileId,
    page_number: item.page_number ?? 1,
    stroke_type: item.stroke_type,
    svg_path: item.svg_path,
    color: item.color,
    stroke_width: item.stroke_width,
    layer_visible: item.layer_visible ?? true,
    sync_status: "synced",
    created_at: item.created_at || now,
    updated_at: item.updated_at || now,
  }));

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("annotations")
      .upsert(sanitizedItems, { onConflict: "id" })
      .select();
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalDB();
  if (!db.annotations) db.annotations = [];

  for (const item of sanitizedItems) {
    const existingIndex = db.annotations.findIndex((a) => a.id === item.id);
    if (existingIndex !== -1) {
      // Last-write-wins based on updated_at
      const existing = db.annotations[existingIndex];
      if (new Date(item.updated_at).getTime() >= new Date(existing.updated_at).getTime()) {
        db.annotations[existingIndex] = item;
      }
    } else {
      db.annotations.push(item);
    }
  }

  writeLocalDB(db);
  return sanitizedItems;
}

export async function deleteAnnotation(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("annotations")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLength = (db.annotations || []).length;
  db.annotations = (db.annotations || []).filter((a) => !(a.id === id && a.workspace_id === workspaceId));
  writeLocalDB(db);
  return db.annotations.length < initLength;
}

// ==========================================
// DIAGRAM LABELS & ACTIVE RECALL API
// ==========================================

export async function createDiagramLabel(data: {
  workspace_id: string;
  file_id: string;
  page_number?: number;
  area_x: number;
  area_y: number;
  area_width: number;
  area_height: number;
  label_text: string;
}): Promise<DiagramLabel> {
  const newLabel: DiagramLabel = {
    id: `label_${crypto.randomUUID()}`,
    workspace_id: data.workspace_id,
    file_id: data.file_id,
    page_number: data.page_number ?? 1,
    area_x: data.area_x,
    area_y: data.area_y,
    area_width: data.area_width,
    area_height: data.area_height,
    label_text: data.label_text.trim(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase
      .from("diagram_labels")
      .insert(newLabel)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.diagram_labels) db.diagram_labels = [];
  db.diagram_labels.push(newLabel);
  writeLocalDB(db);
  return newLabel;
}

export async function getDiagramLabelsByFile(
  fileId: string,
  workspaceId: string,
  pageNumber?: number
): Promise<Array<DiagramLabel & { lastAttempt?: RecallAttempt | null }>> {
  let labels: DiagramLabel[] = [];
  let attempts: RecallAttempt[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("diagram_labels")
      .select("*")
      .eq("file_id", fileId)
      .eq("workspace_id", workspaceId);
    if (typeof pageNumber === "number") {
      query = query.eq("page_number", pageNumber);
    }
    const { data: labelsData, error } = await query.order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    labels = labelsData || [];

    const labelIds = labels.map((l) => l.id);
    if (labelIds.length > 0) {
      const { data: attData } = await supabase
        .from("recall_attempts")
        .select("*")
        .in("diagram_label_id", labelIds)
        .order("attempted_at", { ascending: false });
      attempts = attData || [];
    }
  } else {
    const db = readLocalDB();
    labels = (db.diagram_labels || []).filter((l) => {
      if (l.file_id !== fileId || l.workspace_id !== workspaceId) return false;
      if (typeof pageNumber === "number" && l.page_number !== pageNumber) return false;
      return true;
    });
    attempts = db.recall_attempts || [];
  }

  // Attach latest attempt per label
  return labels.map((label) => {
    const labelAttempts = attempts
      .filter((a) => a.diagram_label_id === label.id)
      .sort((a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime());
    return {
      ...label,
      lastAttempt: labelAttempts[0] || null,
    };
  });
}

export async function deleteDiagramLabel(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("diagram_labels")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLength = (db.diagram_labels || []).length;
  db.diagram_labels = (db.diagram_labels || []).filter((l) => !(l.id === id && l.workspace_id === workspaceId));
  // Cascade delete attempts
  db.recall_attempts = (db.recall_attempts || []).filter((a) => a.diagram_label_id !== id);
  writeLocalDB(db);
  return db.diagram_labels.length < initLength;
}

export async function recordRecallAttempt(data: {
  workspace_id: string;
  diagram_label_id: string;
  correct: boolean;
  user_answer?: string;
}): Promise<RecallAttempt> {
  const attemptRecord: RecallAttempt = {
    id: `attempt_${crypto.randomUUID()}`,
    workspace_id: data.workspace_id,
    diagram_label_id: data.diagram_label_id,
    correct: data.correct,
    user_answer: data.user_answer,
    attempted_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase
      .from("recall_attempts")
      .insert(attemptRecord)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.recall_attempts) db.recall_attempts = [];
  db.recall_attempts.push(attemptRecord);
  writeLocalDB(db);
  return attemptRecord;
}

export async function getRecallStatsByFile(
  fileId: string,
  workspaceId: string,
  pageNumber?: number
): Promise<{
  totalLabels: number;
  masteredLabels: number;
  allMastered: boolean;
  labels: Array<DiagramLabel & { lastAttempt?: RecallAttempt | null }>;
}> {
  const labelsWithAttempts = await getDiagramLabelsByFile(fileId, workspaceId, pageNumber);
  const totalLabels = labelsWithAttempts.length;
  const masteredLabels = labelsWithAttempts.filter(
    (l) => l.lastAttempt && l.lastAttempt.correct === true
  ).length;
  const allMastered = totalLabels > 0 && masteredLabels === totalLabels;

  return {
    totalLabels,
    masteredLabels,
    allMastered,
    labels: labelsWithAttempts,
  };
}

// ==========================================
// NOTES MODULE API (Fase 5)
// ==========================================

export async function createNote(data: {
  workspace_id: string;
  subject_id?: string | null;
  title: string;
  content?: Record<string, unknown> | string | null;
}): Promise<Note> {
  const newNote: Note = {
    id: `note_${crypto.randomUUID()}`,
    workspace_id: data.workspace_id,
    subject_id: data.subject_id || null,
    title: data.title || "Catatan Tanpa Judul",
    content: data.content || { type: "doc", content: [] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase
      .from("notes")
      .insert(newNote)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.notes) db.notes = [];
  db.notes.push(newNote);
  writeLocalDB(db);
  return newNote;
}

export async function getNotes(
  workspaceId: string,
  options?: { search?: string; subject_id?: string; tag?: string }
): Promise<Note[]> {
  let notes: Note[] = [];
  let subjects: Subject[] = [];
  let tags: NoteTag[] = [];
  let links: NoteLink[] = [];
  let attachments: NoteAttachment[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("notes")
      .select("*, subject:subjects(*)")
      .eq("workspace_id", workspaceId);

    if (options?.subject_id) {
      query = query.eq("subject_id", options.subject_id);
    }
    if (options?.search) {
      query = query.textSearch("search_vector", options.search, { type: "plain" });
    }
    const { data: notesData, error } = await query.order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    notes = notesData || [];

    const noteIds = notes.map((n) => n.id);
    if (noteIds.length > 0) {
      const [{ data: tData }, { data: lData }, { data: aData }] = await Promise.all([
        supabase.from("note_tags").select("*").in("note_id", noteIds),
        supabase.from("note_links").select("*").in("source_note_id", noteIds),
        supabase.from("note_attachments").select("*").in("note_id", noteIds),
      ]);
      tags = tData || [];
      links = lData || [];
      attachments = aData || [];
    }
  } else {
    const db = readLocalDB();
    subjects = db.subjects || [];
    tags = db.note_tags || [];
    links = db.note_links || [];
    attachments = db.note_attachments || [];

    notes = (db.notes || []).filter((n) => n.workspace_id === workspaceId);

    if (options?.subject_id) {
      notes = notes.filter((n) => n.subject_id === options.subject_id);
    }
    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      notes = notes.filter((n) => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const contentStr = typeof n.content === "string" ? n.content : JSON.stringify(n.content || {});
        const contentMatch = contentStr.toLowerCase().includes(q);
        return titleMatch || contentMatch;
      });
    }

    notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  // Filter by tag if requested
  if (options?.tag) {
    const matchingNoteIds = new Set(
      tags.filter((t) => t.tag.toLowerCase() === options.tag?.toLowerCase()).map((t) => t.note_id)
    );
    notes = notes.filter((n) => matchingNoteIds.has(n.id));
  }

  return notes.map((n) => {
    const noteTags = tags.filter((t) => t.note_id === n.id).map((t) => t.tag);
    const linksCount = links.filter((l) => l.source_note_id === n.id).length;
    const attachmentsCount = attachments.filter((a) => a.note_id === n.id).length;
    const sub = subjects.find((s) => s.id === n.subject_id) || n.subject || null;
    return {
      ...n,
      subject: sub,
      tags: noteTags,
      links_count: linksCount,
      attachments_count: attachmentsCount,
    };
  });
}

export async function getNoteById(
  id: string,
  workspaceId: string
): Promise<(Note & {
  tags: string[];
  links: Array<{ id: string; target_note_id: string; title: string }>;
  attachments: Array<{ id: string; file_id: string | null; annotation_id: string | null; file: StudyFile | null }>;
}) | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: note, error } = await supabase
      .from("notes")
      .select("*, subject:subjects(*)")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error || !note) return null;

    const [{ data: tData }, { data: lData }, { data: aData }] = await Promise.all([
      supabase.from("note_tags").select("*").eq("note_id", id),
      supabase.from("note_links").select("*, target:notes(title)").eq("source_note_id", id),
      supabase.from("note_attachments").select("*, file:study_files(*)").eq("note_id", id),
    ]);

    const tags = (tData || []).map((t: { tag: string }) => t.tag);
    const links = (lData || []).map((l: { id: string; target_note_id: string; target?: { title: string } }) => ({
      id: l.id,
      target_note_id: l.target_note_id,
      title: l.target?.title || "Catatan Terkait",
    }));
    const attachments = (aData || []).map((a: { id: string; file_id: string | null; annotation_id: string | null; file?: StudyFile | null }) => ({
      id: a.id,
      file_id: a.file_id,
      annotation_id: a.annotation_id,
      file: a.file || null,
    }));

    return {
      ...note,
      tags,
      links,
      attachments,
    };
  }

  const db = readLocalDB();
  const note = (db.notes || []).find((n) => n.id === id && n.workspace_id === workspaceId);
  if (!note) return null;

  const subject = (db.subjects || []).find((s) => s.id === note.subject_id) || null;
  const tags = (db.note_tags || []).filter((t) => t.note_id === id).map((t) => t.tag);
  const links = (db.note_links || [])
    .filter((l) => l.source_note_id === id)
    .map((l) => {
      const targetNote = (db.notes || []).find((n) => n.id === l.target_note_id);
      return {
        id: l.id,
        target_note_id: l.target_note_id,
        title: targetNote?.title || "Catatan Terkait",
      };
    });
  const attachments = (db.note_attachments || [])
    .filter((a) => a.note_id === id)
    .map((a) => {
      const file = (db.study_files || []).find((f) => f.id === a.file_id) || null;
      return {
        id: a.id,
        file_id: a.file_id,
        annotation_id: a.annotation_id,
        file,
      };
    });

  return {
    ...note,
    subject,
    tags,
    links,
    attachments,
  };
}

export async function updateNote(
  id: string,
  workspaceId: string,
  data: { title?: string; content?: Record<string, unknown> | string | null; subject_id?: string | null }
): Promise<Note | null> {
  const updated_at = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: updated, error } = await supabase
      .from("notes")
      .update({ ...data, updated_at })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  }

  const db = readLocalDB();
  const noteIndex = (db.notes || []).findIndex((n) => n.id === id && n.workspace_id === workspaceId);
  if (noteIndex === -1) return null;

  const current = db.notes[noteIndex];
  const updatedNote: Note = {
    ...current,
    title: data.title !== undefined ? data.title : current.title,
    content: data.content !== undefined ? data.content : current.content,
    subject_id: data.subject_id !== undefined ? data.subject_id : current.subject_id,
    updated_at,
  };
  db.notes[noteIndex] = updatedNote;
  writeLocalDB(db);
  return updatedNote;
}

export async function deleteNote(id: string, workspaceId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLen = (db.notes || []).length;
  db.notes = (db.notes || []).filter((n) => !(n.id === id && n.workspace_id === workspaceId));
  // Cascade in local db
  db.note_tags = (db.note_tags || []).filter((t) => t.note_id !== id);
  db.note_links = (db.note_links || []).filter((l) => l.source_note_id !== id && l.target_note_id !== id);
  db.note_attachments = (db.note_attachments || []).filter((a) => a.note_id !== id);
  writeLocalDB(db);
  return db.notes.length < initLen;
}

// --- Note Tags ---
export async function addNoteTag(noteId: string, tag: string, _workspaceId?: string): Promise<NoteTag> {
  void _workspaceId;
  const cleanTag = tag.trim().toLowerCase();
  const newTag: NoteTag = {
    id: `tag_${crypto.randomUUID()}`,
    note_id: noteId,
    tag: cleanTag,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase.from("note_tags").insert(newTag).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.note_tags) db.note_tags = [];
  const exists = db.note_tags.some((t) => t.note_id === noteId && t.tag === cleanTag);
  if (!exists) {
    db.note_tags.push(newTag);
    writeLocalDB(db);
  }
  return newTag;
}

export async function deleteNoteTag(noteId: string, tagText: string, _workspaceId?: string): Promise<boolean> {
  void _workspaceId;
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("note_tags")
      .delete()
      .eq("note_id", noteId)
      .eq("tag", tagText);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLen = (db.note_tags || []).length;
  db.note_tags = (db.note_tags || []).filter((t) => !(t.note_id === noteId && t.tag === tagText));
  writeLocalDB(db);
  return db.note_tags.length < initLen;
}

// --- Note Links ---
export async function addNoteLink(
  sourceNoteId: string,
  targetNoteId: string,
  _workspaceId?: string
): Promise<NoteLink> {
  void _workspaceId;
  if (sourceNoteId === targetNoteId) {
    throw new Error("Tidak dapat menautkan catatan ke dirinya sendiri.");
  }

  const newLink: NoteLink = {
    id: `link_${crypto.randomUUID()}`,
    source_note_id: sourceNoteId,
    target_note_id: targetNoteId,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase.from("note_links").insert(newLink).select().single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.note_links) db.note_links = [];
  const exists = db.note_links.some(
    (l) => l.source_note_id === sourceNoteId && l.target_note_id === targetNoteId
  );
  if (!exists) {
    db.note_links.push(newLink);
    writeLocalDB(db);
  }
  return newLink;
}

export async function deleteNoteLink(linkId: string, _workspaceId?: string): Promise<boolean> {
  void _workspaceId;
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("note_links").delete().eq("id", linkId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLen = (db.note_links || []).length;
  db.note_links = (db.note_links || []).filter((l) => l.id !== linkId);
  writeLocalDB(db);
  return db.note_links.length < initLen;
}

// --- Note Attachments ---
export async function addNoteAttachment(
  noteId: string,
  data: { file_id?: string | null; annotation_id?: string | null },
  _workspaceId?: string
): Promise<NoteAttachment> {
  void _workspaceId;
  const newAttachment: NoteAttachment = {
    id: `att_${crypto.randomUUID()}`,
    note_id: noteId,
    file_id: data.file_id || null,
    annotation_id: data.annotation_id || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { data: created, error } = await supabase
      .from("note_attachments")
      .insert(newAttachment)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  }

  const db = readLocalDB();
  if (!db.note_attachments) db.note_attachments = [];
  const exists = db.note_attachments.some(
    (a) => a.note_id === noteId && a.file_id === data.file_id && a.annotation_id === data.annotation_id
  );
  if (!exists) {
    db.note_attachments.push(newAttachment);
    writeLocalDB(db);
  }
  return newAttachment;
}

export async function deleteNoteAttachment(attachmentId: string, _workspaceId?: string): Promise<boolean> {
  void _workspaceId;
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("note_attachments").delete().eq("id", attachmentId);
    if (error) throw new Error(error.message);
    return true;
  }

  const db = readLocalDB();
  const initLen = (db.note_attachments || []).length;
  db.note_attachments = (db.note_attachments || []).filter((a) => a.id !== attachmentId);
  writeLocalDB(db);
  return db.note_attachments.length < initLen;
}


