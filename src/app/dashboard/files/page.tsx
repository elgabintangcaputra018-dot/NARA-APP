"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import { StudyFile } from "@/lib/db";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertCircle,
  FileCheck,
  Brain,
} from "lucide-react";

export default function FilesPage() {
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/files");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat dokumen");
      setFiles(data.files || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan server";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah file");

      await fetchFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal upload";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Yakin ingin menghapus dokumen ini beserta semua riwayat coretannya?")) {
      return;
    }

    try {
      const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus file");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal hapus";
      alert(msg);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Hero */}
        <section className="bg-gradient-to-br from-white via-surface-card-light to-accent-subtle/40 dark:from-surface-card-dark dark:via-zinc-900/60 dark:to-accent-navy/30 rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-navy/5 dark:bg-accent-navy/80 border border-accent/30 text-accent-navy dark:text-accent-light text-xs font-semibold shadow-xs">
              <Sparkles className="w-3 h-3 text-highlight" />
              <span>Coret Materi & Active Recall (GoodNotes-Style)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Materi & Modul Belajar
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg">
              Unggah modul PDF, soal olimpiade, atau diagram sains untuk langsung dicoret-coret dan dianotasi — berfungsi offline secara penuh!
            </p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <NaraMascot pose="thinking" size="md" />
              <div className="mt-2">
                <NaraBubble position="top" variant="default">
                  Coret modul dan tandai rumus penting bersama Nara!
                </NaraBubble>
              </div>
            </div>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            dragOver
              ? "border-accent bg-accent-subtle/30 dark:bg-accent-navy/20 scale-[1.01]"
              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-surface-card-dark hover:border-accent/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="w-14 h-14 rounded-2xl bg-accent-navy/10 dark:bg-accent-navy/80 text-accent dark:text-accent-light flex items-center justify-center shadow-xs">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {uploading ? "Sedang Mengunggah Dokumen..." : "Klik atau Tarik File ke Sini"}
            </p>
            <p className="text-xs text-zinc-500">
              Mendukung format PDF, PNG, JPG, dan WebP (Maks. 50 MB)
            </p>
          </div>
        </div>

        {/* Files Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Daftar Dokumen ({files.length})
            </h2>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
          </div>

          {files.length === 0 && !loading ? (
            <div className="bg-white dark:bg-surface-card-dark rounded-3xl p-12 text-center border border-surface-border-light dark:border-surface-border-dark space-y-3">
              <FileCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Belum ada dokumen materi yang diunggah.
              </p>
              <p className="text-xs text-zinc-400">
                Unggah silabus, buku teks, atau soal latihan untuk mulai membuat anotasi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {files.map((file) => {
                const isPdf = file.file_type === "pdf";
                return (
                  <div
                    key={file.id}
                    className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-surface-border-light dark:border-surface-border-dark shadow-sm hover:border-accent/40 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isPdf
                              ? "bg-red-100 dark:bg-red-950/50 text-red-600"
                              : "bg-blue-100 dark:bg-blue-950/50 text-accent"
                          }`}
                        >
                          {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPdf
                              ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                              : "bg-blue-50 dark:bg-blue-950/30 text-accent dark:text-accent-light"
                          }`}
                        >
                          {file.file_type}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 title={file.file_name}">
                          {file.file_name}
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          {formatFileSize(file.file_size)} • Diunggah {new Date(file.uploaded_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/files/${file.id}/recall`}
                          className="px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold inline-flex items-center gap-1 transition-all"
                          title="Active Recall Diagram"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Recall</span>
                        </Link>

                        <Link
                          href={`/dashboard/files/${file.id}/annotate`}
                          className="px-3.5 py-1.5 rounded-xl bg-accent-navy text-white hover:bg-accent-navy-light text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all group-hover:scale-105"
                        >
                          <span>Anotasi</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
