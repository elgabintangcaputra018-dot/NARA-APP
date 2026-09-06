"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import { Syllabus, SyllabusTopic } from "@/lib/db";
import { ScheduledPlanResult } from "@/lib/scheduler";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  AlertTriangle,
  Loader2,
  Layers,
  CalendarCheck,
  X,
} from "lucide-react";

export default function SyllabusDetailPage() {
  const params = useParams();
  const router = useRouter();
  const syllabusId = params.id as string;

  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scheduling calculation state
  const [calculatingSchedule, setCalculatingSchedule] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePlan, setSchedulePlan] = useState<ScheduledPlanResult | null>(null);
  const [applyingSchedule, setApplyingSchedule] = useState(false);

  // Fetch syllabus details
  const fetchSyllabus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${syllabusId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat silabus");
      setSyllabus(data.syllabus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan server";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [syllabusId]);

  useEffect(() => {
    fetchSyllabus();
  }, [fetchSyllabus]);

  // Cycle topic status: not_started -> in_progress -> completed -> not_started
  const handleCycleStatus = async (topic: SyllabusTopic) => {
    const nextStatusMap: Record<SyllabusTopic["status"], SyllabusTopic["status"]> = {
      not_started: "in_progress",
      in_progress: "completed",
      completed: "not_started",
    };
    const nextStatus = nextStatusMap[topic.status];

    try {
      // Optimistic update
      setSyllabus((prev) => {
        if (!prev || !prev.topics) return prev;
        const updatedTopics = prev.topics.map((t) =>
          t.id === topic.id ? { ...t, status: nextStatus } : t
        );
        const completed = updatedTopics.filter((t) => t.status === "completed").length;
        const total = updatedTopics.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...prev,
          topics: updatedTopics,
          completed_topics: completed,
          progress_percentage: progress,
        };
      });

      const res = await fetch(`/api/syllabus/${syllabusId}/topics/${topic.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error("Gagal memperbarui status topik");
    } catch (err) {
      console.error(err);
      fetchSyllabus(); // Revert on failure
    }
  };

  // Run auto-scheduler preview
  const handleRunAutoScheduler = async () => {
    try {
      setCalculatingSchedule(true);
      // Artificial delay for smooth mascot thinking state display
      const [res] = await Promise.all([
        fetch(`/api/syllabus/${syllabusId}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apply: false }),
        }),
        new Promise((r) => setTimeout(r, 700)),
      ]);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyusun jadwal");

      setSchedulePlan(data.plan);
      setShowScheduleModal(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Kesalahan penjadwalan");
    } finally {
      setCalculatingSchedule(false);
    }
  };

  // Apply auto-scheduler plan into study_sessions
  const handleApplySchedule = async () => {
    try {
      setApplyingSchedule(true);
      const res = await fetch(`/api/syllabus/${syllabusId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan jadwal");

      setShowScheduleModal(false);
      router.push("/dashboard/schedule");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menerapkan");
      setApplyingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
        <Navbar />
        <div className="py-28 flex flex-col items-center justify-center text-zinc-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent-navy dark:text-accent" />
          <p className="text-sm font-medium">Membuka silabus materi OSN...</p>
        </div>
      </div>
    );
  }

  if (error || !syllabus) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Silabus Tidak Ditemukan
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
          <Link
            href="/dashboard/syllabus"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-navy text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Galeri Silabus</span>
          </Link>
        </div>
      </div>
    );
  }

  const subjectColor = syllabus.subject?.color || "#6B95F1";
  const subjectName = syllabus.subject?.name || "Mata Pelajaran Umum";
  const progress = syllabus.progress_percentage ?? 0;
  const topics = syllabus.topics || [];

  const completedCount = topics.filter((t) => t.status === "completed").length;
  const inProgressCount = topics.filter((t) => t.status === "in_progress").length;
  const notStartedCount = topics.filter((t) => t.status === "not_started").length;

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/syllabus"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Semua Silabus</span>
          </Link>

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${subjectColor}18`,
              color: subjectColor,
              border: `1px solid ${subjectColor}33`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: subjectColor }}
            />
            {subjectName}
          </span>
        </div>

        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {syllabus.title}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {syllabus.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Target Selesai:{" "}
                  {new Date(syllabus.deadline).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Trigger Auto-Scheduler Button */}
          <button
            type="button"
            onClick={handleRunAutoScheduler}
            disabled={calculatingSchedule}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-navy text-white text-xs font-bold shadow-md hover:bg-accent-navy/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {calculatingSchedule ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menghitung Jadwal...</span>
              </>
            ) : (
              <>
                <CalendarCheck className="w-4 h-4" />
                <span>Susun Ulang Jadwal</span>
              </>
            )}
          </button>
        </div>

        {/* Mascot Calculation Floating Overlay */}
        {calculatingSchedule && (
          <div className="p-4 rounded-3xl bg-white dark:bg-surface-card-dark border border-surface-border-light dark:border-surface-border-dark flex items-center gap-4 animate-pulse shadow-sm">
            <NaraMascot pose="thinking" size="sm" />
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Algoritma sedang menganalisis slot kosong dan bobot topik...
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Memastikan batas buffer 15% per minggu dan mengurutkan topik berprioritas tinggi.
              </p>
            </div>
          </div>
        )}

        {/* Progress & Stats Card */}
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Progress Penguasaan Silabus
              </span>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                {progress}% Dipelajari
              </h3>
            </div>

            {/* Topic Status Badges */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completedCount} Selesai
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" />
                {inProgressCount} Berjalan
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5" />
                {notStartedCount} Belum
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-navy via-accent to-emerald-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Topics List Card */}
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-navy dark:text-accent" />
              <span>Rincian Topik Silabus ({topics.length})</span>
            </h2>
            <span className="text-[11px] text-zinc-400 italic">
              Klik status topik untuk memperbarui progres belajarmu
            </span>
          </div>

          {topics.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center italic">
              Belum ada topik di dalam silabus ini.
            </p>
          ) : (
            <div className="space-y-2.5">
              {topics.map((t, idx) => {
                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <Circle className="w-3 h-3 text-zinc-400" />
                    <span>Belum Mulai</span>
                  </span>
                );

                if (t.status === "in_progress") {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer hover:bg-amber-100 transition-colors">
                      <PlayCircle className="w-3 h-3 text-amber-500" />
                      <span>Sedang Belajar</span>
                    </span>
                  );
                } else if (t.status === "completed") {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Sudah Selesai</span>
                    </span>
                  );
                }

                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent-navy/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-6 text-center text-xs font-bold text-zinc-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {t.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {/* Weight pill */}
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300"
                        title="Bobot kesulitan (diisi mandiri)"
                      >
                        Bobot {t.weight}/5
                      </span>

                      {/* Duration pill */}
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span>{t.estimated_minutes}m</span>
                      </span>

                      {/* Interactive Status */}
                      <div onClick={() => handleCycleStatus(t)} title="Klik untuk ubah status">
                        {statusBadge}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Auto-Scheduler Result Modal */}
      {showScheduleModal && schedulePlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark w-full max-w-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-accent-navy dark:text-accent" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Preview Auto-Jadwal Belajar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overload Warning Banner if Applicable */}
            {schedulePlan.isOverloaded && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">{schedulePlan.warningMessage}</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Kapasitas slot belajar (16:00–22:00) dengan batas buffer 15% sebelum tanggal deadline tidak mencukupi untuk seluruh topik. Silakan longgarkan deadline atau kurangi durasi topik.
                  </p>
                </div>
              </div>
            )}

            {/* Plan Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Sesi Siap Alokasi</span>
                <p className="text-base font-black text-accent-navy dark:text-accent">
                  {schedulePlan.scheduledSessions.length} Sesi
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Menit Belajar</span>
                <p className="text-base font-black text-zinc-800 dark:text-zinc-200">
                  {schedulePlan.totalAllocatedMinutes} Menit
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Buffer Mingguan Aman</span>
                <p className="text-base font-black text-emerald-600">
                  15% Terjaga
                </p>
              </div>
            </div>

            {/* Scheduled Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Urutan Sesi Berdasarkan Skor Prioritas:
              </h4>
              {schedulePlan.scheduledSessions.map((session, i) => {
                const startTime = new Date(session.start_time);
                const formattedDate = startTime.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const formattedHour = startTime.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="overflow-hidden">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {session.topic_title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                        <span className="font-medium">{formattedDate}, pk {formattedHour}</span>
                        <span>•</span>
                        <span>{session.duration_minutes}m</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent-navy/10 text-accent-navy dark:text-accent font-semibold">
                        Skor: {session.priority_score}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Unallocated topics if any */}
              {schedulePlan.unallocatedTopics.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400">
                    Topik Terancam Belum Kebagian Slot:
                  </h4>
                  <div className="space-y-1.5 mt-1.5">
                    {schedulePlan.unallocatedTopics.map((un, j) => (
                      <div
                        key={j}
                        className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs flex justify-between"
                      >
                        <span className="font-medium text-red-900 dark:text-red-200">{un.topic_title}</span>
                        <span className="text-[11px] text-red-600">Bobot {un.weight}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Tutup
              </button>

              <button
                type="button"
                disabled={applyingSchedule || schedulePlan.scheduledSessions.length === 0}
                onClick={handleApplySchedule}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-accent-navy text-white text-xs font-bold shadow-md hover:bg-accent-navy/90 active:scale-95 transition-all disabled:opacity-40"
              >
                {applyingSchedule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menerapkan ke Kalender...</span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Terapkan ke Jadwal Belajar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
