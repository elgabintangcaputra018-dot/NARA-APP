"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import { Note, Subject } from "@/lib/db";
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  Tag as TagIcon,
  Paperclip,
  Link2,
  Trash2,
  Loader2,
  Calendar,
  ArrowRight,
  X,
} from "lucide-react";

// Helper to extract clean plain text preview from Tiptap JSON
function extractTextSnippet(content: unknown, maxLength = 130): string {
  if (!content) return "Catatan masih kosong. Klik untuk mulai menulis...";
  if (typeof content === "string") {
    return content.length > maxLength ? content.slice(0, maxLength) + "..." : content;
  }
  let text = "";
  function traverse(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (typeof n.text === "string") text += n.text + " ";
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        traverse(child);
      }
    }
  }
  traverse(content);
  text = text.trim();
  if (!text) return "Catatan masih kosong. Klik untuk mulai menulis...";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

export default function NotesPage() {
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [allTags, setAllTags] = useState<string[]>([]);

  // Fetch subjects
  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json();
        if (res.ok && data.subjects) {
          setSubjects(data.subjects);
        }
      } catch (err) {
        console.error("Gagal memuat mata pelajaran:", err);
      }
    }
    loadSubjects();
  }, []);

  // Fetch notes with filters
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedSubjectId !== "all") params.set("subjectId", selectedSubjectId);
      if (selectedTag !== "all") params.set("tag", selectedTag);

      const res = await fetch(`/api/notes?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.notes) {
        setNotes(data.notes);

        // Aggregate unique tags across all notes in workspace if not filtered
        if (selectedTag === "all" && !searchQuery) {
          const tagsSet = new Set<string>();
          data.notes.forEach((n: Note) => {
            if (n.tags && Array.isArray(n.tags)) {
              n.tags.forEach((t: string) => tagsSet.add(t));
            }
          });
          setAllTags(Array.from(tagsSet));
        }
      }
    } catch (err) {
      console.error("Gagal memuat catatan:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSubjectId, selectedTag]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchNotes]);

  // Create new note
  const handleCreateNote = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Catatan Baru Tanpa Judul",
          subject_id: selectedSubjectId !== "all" ? selectedSubjectId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat catatan");

      if (data.note?.id) {
        router.push(`/dashboard/notes/${data.note.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat catatan";
      alert(msg);
      setCreating(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Hapus catatan ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }

    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus");
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus";
      alert(msg);
    }
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-accent-navy/10 dark:bg-accent-subtle-dark text-accent-navy dark:text-accent-light border border-accent/20">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Catatan Materi OSN
              </h1>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dokumentasikan rumus, pembuktian teori, dan tautkan ke lembar materi serta coretan belajar.
            </p>
          </div>

          <button
            onClick={handleCreateNote}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-navy text-white text-sm font-semibold shadow-sm hover:bg-accent-navy/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membuat...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Buat Catatan Baru</span>
              </>
            )}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul catatan atau isi teks (Full-Text Search)..."
                className="w-full pl-10 pr-9 py-2 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-accent-navy/20 dark:focus:ring-accent/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Subject Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <BookOpen className="w-4 h-4 text-zinc-400 shrink-0" />
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full md:w-48 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
              >
                <option value="all">Semua Mapel</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag Cloud Pills */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1">
                <TagIcon className="w-3 h-3" /> Filter Tag:
              </span>
              <button
                onClick={() => setSelectedTag("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedTag === "all"
                    ? "bg-accent-navy text-white shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                Semua
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? "all" : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedTag === tag
                      ? "bg-accent-navy text-white shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes Content State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent-navy dark:text-accent" />
            <p className="text-sm">Memuat daftar catatan OSN...</p>
          </div>
        ) : notes.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark flex flex-col items-center text-center space-y-6">
            <div className="flex flex-col items-center gap-3">
              <NaraMascot pose={searchQuery ? "thinking" : "idle"} size="md" />
              <NaraBubble position="bottom">
                {searchQuery || selectedSubjectId !== "all" || selectedTag !== "all"
                  ? "Tidak ada catatan yang cocok dengan filter atau kata kunci pencarianmu."
                  : "Belum ada catatan materi! Tulis rumus, ringkasan konsep, dan tautkan ke dokumen latihanmu."}
              </NaraBubble>
            </div>

            {searchQuery || selectedSubjectId !== "all" || selectedTag !== "all" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSubjectId("all");
                  setSelectedTag("all");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Reset Semua Filter
              </button>
            ) : (
              <button
                onClick={handleCreateNote}
                disabled={creating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-navy text-white text-sm font-semibold shadow-sm hover:bg-accent-navy/90 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Mulai Tulis Catatan Pertama</span>
              </button>
            )}
          </div>
        ) : (
          /* Notes Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map((note) => {
              const snippet = extractTextSnippet(note.content);
              const subjectColor = note.subject?.color || "#6B95F1";
              const subjectName = note.subject?.name || "Umum";

              const formattedDate = new Date(note.updated_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={note.id}
                  onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                  className="group relative bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-5 shadow-xs hover:shadow-md hover:border-accent-navy/40 dark:hover:border-accent/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Card Header: Subject Pill + Date + Delete */}
                  <div>
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

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          title="Hapus Catatan"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Title */}
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-accent-navy dark:group-hover:text-accent-light transition-colors line-clamp-1 mb-1.5">
                      {note.title || "Catatan Tanpa Judul"}
                    </h2>

                    {/* Content Snippet */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                      {snippet}
                    </p>
                  </div>

                  {/* Card Footer: Tags & Badges */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 mt-auto">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1 overflow-hidden max-w-[65%]">
                      {note.tags && note.tags.length > 0 ? (
                        note.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Tanpa tag</span>
                      )}
                      {note.tags && note.tags.length > 3 && (
                        <span className="text-[10px] text-zinc-400">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Counters: Attachments & Links */}
                    <div className="flex items-center gap-2 text-zinc-400 shrink-0">
                      {(note.attachments_count ?? 0) > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400"
                          title={`${note.attachments_count} lampiran materi`}
                        >
                          <Paperclip className="w-3 h-3 text-accent-navy dark:text-accent" />
                          <span>{note.attachments_count}</span>
                        </span>
                      )}

                      {(note.links_count ?? 0) > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400"
                          title={`${note.links_count} tautan catatan`}
                        >
                          <Link2 className="w-3 h-3 text-amber-500" />
                          <span>{note.links_count}</span>
                        </span>
                      )}

                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-accent-navy dark:group-hover:text-accent-light group-hover:translate-x-0.5 transition-all" />
                    </div>
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
