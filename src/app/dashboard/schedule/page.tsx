"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Trash2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  priority: string;
  color: string;
}

interface StudySession {
  id: string;
  workspace_id: string;
  subject_id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  source: string;
  calendar_event_id: string | null;
  subject?: Subject;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00
const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function SchedulePage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formHour, setFormHour] = useState("08:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formStatus, setFormStatus] = useState<StudySession["status"]>("planned");

  // Success Celebration State
  const [celebration, setCelebration] = useState(false);
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);

  // Helper: Week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      const start = new Date(currentWeekStart);
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 7);

      const [sessRes, subjRes] = await Promise.all([
        fetch(`/api/schedule/sessions?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
        fetch("/api/subjects"),
      ]);

      const sessData = await sessRes.json();
      const subjData = await subjRes.json();

      setSessions(sessData.sessions || []);
      setSubjects(subjData.subjects || []);
    } catch (err) {
      console.error("Error loading schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    // Check and recover overdue auto-generated sessions on mount
    fetch("/api/schedule/replan", { method: "POST" })
      .catch((err) => console.error("Replan check error:", err))
      .finally(() => {
        fetchScheduleData();
      });
  }, [fetchScheduleData]);

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const openAddSessionModal = (dayDate?: Date, hour?: number) => {
    setEditingSession(null);
    setFormSubjectId(subjects[0]?.id || "");
    setFormTitle("Sesi Belajar & Latihan Soal");
    const targetDate = dayDate || new Date();
    setFormDate(targetDate.toISOString().split("T")[0]);
    setFormHour(hour ? `${String(hour).padStart(2, "0")}:00` : "08:00");
    setFormDuration(60);
    setFormStatus("planned");
    setModalOpen(true);
  };

  const openEditSessionModal = (session: StudySession) => {
    setEditingSession(session);
    setFormSubjectId(session.subject_id);
    setFormTitle(session.title);
    const dt = new Date(session.start_time);
    setFormDate(dt.toISOString().split("T")[0]);
    setFormHour(`${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`);
    setFormDuration(session.duration_minutes);
    setFormStatus(session.status);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectId) {
      alert("Silakan pilih mata pelajaran.");
      return;
    }

    setSubmitting(true);
    try {
      const [hours, minutes] = formHour.split(":").map(Number);
      const combinedDate = new Date(formDate);
      combinedDate.setHours(hours, minutes, 0, 0);

      const payload = {
        subject_id: formSubjectId,
        title: formTitle,
        start_time: combinedDate.toISOString(),
        duration_minutes: Number(formDuration),
        status: formStatus,
      };

      const url = editingSession
        ? `/api/schedule/sessions/${editingSession.id}`
        : "/api/schedule/sessions";
      const method = editingSession ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan sesi.");

      // If status changed to completed, trigger celebration!
      if (formStatus === "completed" && (!editingSession || editingSession.status !== "completed")) {
        triggerCelebration();
      }

      setModalOpen(false);
      await fetchScheduleData();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan sesi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm("Hapus sesi belajar ini dari jadwal?")) return;
    try {
      await fetch(`/api/schedule/sessions/${id}`, { method: "DELETE" });
      setModalOpen(false);
      await fetchScheduleData();
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const triggerCelebration = () => {
    setCelebration(true);
    setTimeout(() => {
      setCelebration(false);
    }, 4000);
  };

  // Drag and Drop Reschedule
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData("text/plain", sessionId);
    setDraggedSessionId(sessionId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDay: Date, targetHour: number) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData("text/plain") || draggedSessionId;
    if (!sessionId) return;

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Calculate new start_time
    const newStart = new Date(targetDay);
    newStart.setHours(targetHour, 0, 0, 0);

    try {
      const res = await fetch(`/api/schedule/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_time: newStart.toISOString() }),
      });
      if (res.ok) {
        await fetchScheduleData();
      }
    } catch (err) {
      console.error("Reschedule drop error:", err);
    } finally {
      setDraggedSessionId(null);
    }
  };

  const formatWeekRangeLabel = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const startStr = currentWeekStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const endStr = end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    return `${startStr} — ${endStr}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-surface-card-dark p-5 rounded-3xl border border-surface-border-light dark:border-surface-border-dark shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-navy/10 dark:bg-accent-navy/80 text-accent dark:text-accent-light border border-accent/20 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                Kalender Jadwal Belajar
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">{formatWeekRangeLabel()}</p>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-nara-primary" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Hari Ini
            </button>
            <div className="inline-flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                title="Minggu Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                title="Minggu Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => openAddSessionModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-navy hover:bg-accent-navy-light text-white text-xs font-semibold shadow-sm border border-accent/30"
            >
              <Plus className="w-4 h-4" />
              <span>Jadwalkan Sesi</span>
            </button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark shadow-sm overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Header Row: Days */}
            <div className="grid grid-cols-8 border-b border-surface-border-light dark:border-surface-border-dark text-center text-xs font-bold py-3 bg-zinc-50/70 dark:bg-zinc-900/40">
              <div className="text-zinc-400 font-normal">Waktu</div>
              {weekDays.map((day, idx) => {
                const isToday = new Date().toDateString() === day.toDateString();
                return (
                  <div key={idx} className="space-y-0.5">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      {DAY_NAMES[idx]}
                    </span>
                    <div>
                      <span
                        className={`inline-block w-6 h-6 leading-6 rounded-full text-xs ${
                          isToday
                            ? "bg-accent text-white font-bold"
                            : "text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slot Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 min-h-[58px] text-xs">
                  {/* Time label */}
                  <div className="p-2 text-[11px] font-mono text-zinc-400 text-center border-r border-zinc-100 dark:border-zinc-800/60 select-none">
                    {String(hour).padStart(2, "0")}:00
                  </div>

                  {/* 7 Day Slots */}
                  {weekDays.map((day, dayIdx) => {
                    const year = day.getFullYear();
                    const month = String(day.getMonth() + 1).padStart(2, "0");
                    const date = String(day.getDate()).padStart(2, "0");
                    const slotDateStr = `${year}-${month}-${date}`;

                    // Find sessions matching this day and hour
                    const slotSessions = sessions.filter((s) => {
                      const sDate = new Date(s.start_time);
                      const sYear = sDate.getFullYear();
                      const sMonth = String(sDate.getMonth() + 1).padStart(2, "0");
                      const sDateDay = String(sDate.getDate()).padStart(2, "0");
                      const sDateStr = `${sYear}-${sMonth}-${sDateDay}`;
                      const isSameDay = sDateStr === slotDateStr;
                      const isSameHour = sDate.getHours() === hour;
                      return isSameDay && isSameHour;
                    });

                    return (
                      <div
                        key={dayIdx}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day, hour)}
                        onClick={(e) => {
                          // Click empty slot to add session
                          if (e.target === e.currentTarget) {
                            openAddSessionModal(day, hour);
                          }
                        }}
                        className="p-1 border-r border-zinc-100 dark:border-zinc-800/60 last:border-r-0 hover:bg-accent-subtle/30 dark:hover:bg-accent-subtle-dark/20 transition-colors relative group"
                      >
                        {slotSessions.map((session) => {
                          const isCompleted = session.status === "completed";
                          const isInProgress = session.status === "in_progress";
                          const isCancelled = session.status === "cancelled";
                          const color = session.subject?.color || "#6B95F1";

                          return (
                            <div
                              key={session.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, session.id)}
                              onClick={() => openEditSessionModal(session)}
                              className={`p-2 rounded-xl text-left cursor-grab active:cursor-grabbing border shadow-xs transition-all hover:scale-[1.02] hover:shadow-md mb-1 relative overflow-hidden ${
                                isCompleted
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                  : isCancelled
                                  ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 text-zinc-400 line-through"
                                  : isInProgress
                                  ? "bg-blue-50 dark:bg-blue-950/40 border-accent text-accent-dark dark:text-accent-light"
                                  : "bg-white dark:bg-surface-card-dark border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                              }`}
                              style={{ borderLeftWidth: "4px", borderLeftColor: color }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[11px] truncate block leading-tight">
                                  {session.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {session.source === "auto_generated" && (
                                    <span
                                      className="px-1 py-0.5 rounded text-[8px] font-black bg-accent-navy text-white shadow-2xs leading-none"
                                      title="Auto-generated dari silabus"
                                    >
                                      AUTO
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-zinc-500 dark:text-zinc-400 mt-1">
                                <span className="truncate">{session.subject?.name}</span>
                                <span>{session.duration_minutes}m</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Add / Edit Sesi Belajar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-surface-border-light dark:border-surface-border-dark relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                {editingSession ? "Kelola Sesi Belajar" : "Jadwalkan Sesi Belajar"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
              {/* Mata Pelajaran */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.priority})
                    </option>
                  ))}
                </select>
              </div>

              {/* Judul Sesi */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Topik / Fokus Latihan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Pembelahan Sel Mitosis, Hukum Newton II"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={formHour}
                    onChange={(e) => setFormHour(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Durasi & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Durasi (Menit)
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  >
                    <option value={30}>30 Menit (Kilas Cepat)</option>
                    <option value={45}>45 Menit</option>
                    <option value={60}>60 Menit (1 Jam Standard)</option>
                    <option value={90}>90 Menit (Latihan Soal)</option>
                    <option value={120}>120 Menit (Simulasi Penuh)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Status Sesi
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StudySession["status"])}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  >
                    <option value="planned">📅 Terencana</option>
                    <option value="in_progress">⏳ Sedang Berjalan</option>
                    <option value="completed">✅ Selesai (Great Job!)</option>
                    <option value="cancelled">❌ Dibatalkan</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {editingSession ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(editingSession.id)}
                    className="p-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-accent-navy hover:bg-accent-navy-light text-white text-xs font-semibold shadow-md shadow-accent-navy/20 border border-accent/30 flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingSession ? "Simpan Perubahan" : "Jadwalkan"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Celebration Toast Modal: Nara Mascot Success */}
      {celebration && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-surface-card-dark rounded-3xl p-5 shadow-2xl border-2 border-emerald-400 dark:border-emerald-700 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="relative">
            <NaraMascot pose="success" size="sm" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-sm">
              <Sparkles className="w-4 h-4 text-highlight" />
              <span>Great job!</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Satu sesi belajar telah berhasil kamu selesaikan. Selangkah lebih dekat menuju medali OSN!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
