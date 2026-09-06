"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Target,
  Flame,
  Clock,
  Sparkles,
} from "lucide-react";

interface Subject {
  id: string;
  workspace_id: string;
  name: string;
  priority: "very_high" | "high" | "medium" | "low" | "very_low";
  mode: "intensive" | "moderate" | "deadline_crunch";
  color: string;
  created_at: string;
}

const PRIORITY_CONFIG = {
  very_high: { label: "Sangat Tinggi", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  high: { label: "Tinggi", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  medium: { label: "Sedang", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  low: { label: "Rendah", bg: "bg-lime-50 dark:bg-lime-950/40", text: "text-lime-700 dark:text-lime-300", border: "border-lime-200 dark:border-lime-800" },
  very_low: { label: "Sangat Rendah", bg: "bg-zinc-50 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-300", border: "border-zinc-200 dark:border-zinc-700" },
};

const MODE_CONFIG = {
  intensive: { label: "Intensif", desc: "Materi utama & latihan harian", icon: Flame },
  moderate: { label: "Moderat", desc: "Review berkala teratur", icon: Clock },
  deadline_crunch: { label: "Deadline Crunch", desc: "Fokus soal menjelang seleksi", icon: Target },
};

const PRESET_COLORS = [
  "#6B95F1", // Nara Blue
  "#162342", // Nara Navy
  "#E5A93C", // Nara Gold
  "#EF4444", // Red
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<Subject["priority"]>("medium");
  const [mode, setMode] = useState<Subject["mode"]>("moderate");
  const [color, setColor] = useState("#6B95F1");

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/subjects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat mata pelajaran.");
      setSubjects(data.subjects || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setName("");
    setPriority("high");
    setMode("moderate");
    setColor("#6B95F1");
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setPriority(subject.priority);
    setMode(subject.mode);
    setColor(subject.color || "#6B95F1");
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama mata pelajaran wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = editingSubject ? `/api/subjects/${editingSubject.id}` : "/api/subjects";
      const method = editingSubject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, priority, mode, color }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan data.");

      setSuccess(data.message || "Berhasil disimpan.");
      setModalOpen(false);
      await fetchSubjects();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, subjectName: string) => {
    if (!window.confirm(`Hapus mata pelajaran "${subjectName}"? Seluruh sesi belajar terkait juga akan dihapus.`)) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus.");
      setSuccess(`Mata pelajaran "${subjectName}" berhasil dihapus.`);
      await fetchSubjects();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header Card */}
        <section className="bg-gradient-to-br from-white via-surface-card-light to-accent-subtle/40 dark:from-surface-card-dark dark:via-zinc-900/60 dark:to-accent-navy/30 rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-navy/5 dark:bg-accent-navy/80 border border-accent/30 text-accent-navy dark:text-accent-light text-xs font-semibold shadow-xs">
              <Sparkles className="w-3 h-3 text-highlight" />
              <span>Target Penguasaan OSN</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Mata Pelajaran & Topik Belajar
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
              Atur prioritas dan intensitas belajar per bidang (Biologi, Fisika, Matematika, Kimia, Astronomi, dsb) untuk menyusun jadwal yang seimbang.
            </p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <NaraMascot pose={subjects.length === 0 ? "idle" : "focus"} size="md" />
              <div className="mt-2">
                <NaraBubble position="top" variant="default">
                  {subjects.length === 0
                    ? "Yuk mulai dari sini! Tambahkan mata pelajaran OSN pertamamu."
                    : "Pilih mata pelajaran yang ingin kamu fokuskan minggu ini."}
                </NaraBubble>
              </div>
            </div>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Daftar Bidang Studi ({subjects.length})
            </h2>
            <p className="text-xs text-zinc-500">Mata pelajaran aktif dalam ruang belajarmu</p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-accent-navy to-accent-dark hover:from-accent-navy-light hover:to-accent text-white text-xs font-semibold shadow-md shadow-accent-navy/20 border border-accent/30 transition-all group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Tambah Mata Pelajaran</span>
          </button>
        </div>

        {/* Notifications */}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Subject Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-zinc-500">Memuat mata pelajaran...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl p-12 border border-dashed border-zinc-300 dark:border-zinc-700 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-subtle dark:bg-accent-subtle-dark flex items-center justify-center text-accent">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Belum ada mata pelajaran</h3>
              <p className="text-xs text-zinc-500">
                Tambahkan mata pelajaran untuk mulai menyusun target sesi belajar di kalender mingguan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent-dark text-white text-xs font-semibold shadow-sm"
            >
              + Tambah Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subj) => {
              const priorityInfo = PRIORITY_CONFIG[subj.priority] || PRIORITY_CONFIG.medium;
              const modeInfo = MODE_CONFIG[subj.mode] || MODE_CONFIG.moderate;
              const ModeIcon = modeInfo.icon;

              return (
                <div
                  key={subj.id}
                  className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-surface-border-light dark:border-surface-border-dark shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                >
                  {/* Subject Accent Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: subj.color || "#6B95F1" }}
                  />

                  <div className="space-y-4 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: subj.color || "#6B95F1" }}
                        />
                        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
                          {subj.name}
                        </h3>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(subj)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Edit Mata Pelajaran"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(subj.id, subj.name)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Priority Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold border ${priorityInfo.bg} ${priorityInfo.text} ${priorityInfo.border}`}
                      >
                        Prioritas: {priorityInfo.label}
                      </span>

                      {/* Mode Badge */}
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 font-medium inline-flex items-center gap-1">
                        <ModeIcon className="w-3 h-3 text-accent" />
                        <span>{modeInfo.label}</span>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {modeInfo.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Dibuat pada {new Date(subj.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Form: Tambah / Edit Subject */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-surface-border-light dark:border-surface-border-dark relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                {editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran OSN"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 pt-5">
              {/* Nama */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nama Bidang / Topik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Biologi Sel & Molekuler, Kinematika Fisika"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Prioritas */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tingkat Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Subject["priority"])}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                >
                  <option value="very_high">Sangat Tinggi (Fokus Utama / Bobot Terbesar)</option>
                  <option value="high">Tinggi (Materi Sering Keluar di OSN)</option>
                  <option value="medium">Sedang (Pemahaman Konsep Standar)</option>
                  <option value="low">Rendah (Review Singkat)</option>
                  <option value="very_low">Sangat Rendah (Materi Pelengkap)</option>
                </select>
              </div>

              {/* Mode Belajar */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Mode Belajar
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Subject["mode"])}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                >
                  <option value="intensive">Intensif (Latihan Soal Berat Tiap Hari)</option>
                  <option value="moderate">Moderat (Sesi Teratur 2-3x Seminggu)</option>
                  <option value="deadline_crunch">Deadline Crunch (Target Cepat Menjelang Seleksi)</option>
                </select>
              </div>

              {/* Warna Kartu */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Warna Penanda</span>
                  <span className="font-mono text-[11px] text-zinc-400">{color}</span>
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === preset ? "scale-125 ring-2 ring-accent ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                    title="Pilih warna kustom"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-semibold shadow-md shadow-accent/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSubject ? "Simpan Perubahan" : "Tambahkan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
