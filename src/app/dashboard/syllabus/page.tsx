"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import { Syllabus } from "@/lib/db";
import {
  Plus,
  Calendar,
  ArrowRight,
  Trash2,
  Loader2,
  Layers,
} from "lucide-react";

export default function SyllabusGalleryPage() {
  const router = useRouter();
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSyllabi = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/syllabus");
      const data = await res.json();
      if (res.ok && data.syllabi) {
        setSyllabi(data.syllabi);
      }
    } catch (err) {
      console.error("Gagal memuat silabus:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Hapus silabus "${title}" beserta seluruh topiknya?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/syllabus/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus silabus");
      setSyllabi((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-accent-navy/10 dark:bg-accent-subtle-dark text-accent-navy dark:text-accent-light border border-accent/20">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Silabus &amp; Auto-Jadwal OSN
              </h1>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Ekstrak bab silabus dari PDF, tetapkan bobot kesulitan mandiri, dan susun alokasi jadwal belajar otomatis tanpa batas.
            </p>
          </div>

          <Link
            href="/dashboard/syllabus/upload"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-navy text-white text-sm font-semibold shadow-sm hover:bg-accent-navy/90 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah Silabus PDF</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-navy dark:text-accent" />
            <p className="text-sm font-medium">Memuat silabus materi...</p>
          </div>
        ) : syllabi.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark flex flex-col items-center text-center space-y-6">
            <div className="flex flex-col items-center gap-3">
              <NaraMascot pose="thinking" size="md" />
              <NaraBubble position="bottom">
                Belum ada silabus yang diunggah. Yuk unggah silabus PDF atau e-book OSN pertamamu, ekstrak topiknya, dan biarkan algoritma menyusun jadwal belajar terbaik!
              </NaraBubble>
            </div>

            <Link
              href="/dashboard/syllabus/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-navy text-white text-sm font-semibold shadow-sm hover:bg-accent-navy/90 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Silabus Pertama</span>
            </Link>
          </div>
        ) : (
          /* Syllabi Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {syllabi.map((syl) => {
              const subjectColor = syl.subject?.color || "#6B95F1";
              const subjectName = syl.subject?.name || "Mata Pelajaran Umum";
              const progress = syl.progress_percentage ?? 0;

              let deadlineText = "Tanpa deadline";
              let deadlineBadgeClass = "text-zinc-500 bg-zinc-100 dark:bg-zinc-800";

              if (syl.deadline) {
                const deadlineDate = new Date(syl.deadline);
                const diffDays = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                deadlineText = deadlineDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                if (diffDays <= 0) {
                  deadlineBadgeClass = "text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900";
                  deadlineText += " (Lewat)";
                } else if (diffDays <= 7) {
                  deadlineBadgeClass = "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900";
                  deadlineText += ` (${diffDays} hari lagi)`;
                } else {
                  deadlineBadgeClass = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
                  deadlineText += ` (${diffDays} hari)`;
                }
              }

              return (
                <div
                  key={syl.id}
                  onClick={() => router.push(`/dashboard/syllabus/${syl.id}`)}
                  className="group relative bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-5 shadow-xs hover:shadow-md hover:border-accent-navy/40 dark:hover:border-accent/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Subject badge & Delete */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${subjectColor}18`,
                          color: subjectColor,
                          border: `1px solid ${subjectColor}33`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: subjectColor }}
                        />
                        {subjectName}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(syl.id, syl.title, e)}
                        title="Hapus Silabus"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-accent-navy dark:group-hover:text-accent-light transition-colors line-clamp-2 mb-3">
                      {syl.title}
                    </h2>

                    {/* Deadline Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${deadlineBadgeClass}`}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{deadlineText}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Progress Penguasaan
                        </span>
                        <span className="font-bold text-accent-navy dark:text-accent">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-navy to-accent transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {syl.completed_topics ?? 0} dari {syl.total_topics ?? 0} topik dikuasai
                      </p>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-accent-navy dark:group-hover:text-accent-light">
                    <span>Lihat Rincian &amp; Auto-Jadwal</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
