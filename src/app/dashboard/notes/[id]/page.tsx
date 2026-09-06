"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import RichTextEditor from "@/components/RichTextEditor";
import { Subject, StudyFile } from "@/lib/db";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Tag as TagIcon,
  Plus,
  X,
  BookOpen,
  Link2,
  Paperclip,
  Trash2,
  Search,
  FileText,
  Image as ImageIcon,
  PenTool,
  Brain,
} from "lucide-react";

interface NoteDetail {
  id: string;
  workspace_id: string;
  subject_id: string | null;
  title: string;
  content: Record<string, unknown> | null | undefined;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
  tags: string[];
  links: Array<{ id: string; target_note_id: string; title: string }>;
  attachments: Array<{
    id: string;
    file_id: string | null;
    annotation_id: string | null;
    file: StudyFile | null;
  }>;
}

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params.id as string;

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local mutable state for title & content
  const [title, setTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // Tag input state
  const [newTagInput, setNewTagInput] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  // Note linking state
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkCandidates, setLinkCandidates] = useState<Array<{ id: string; title: string; subject?: Subject }>>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);

  // Attachment modal state
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<StudyFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [attachingFile, setAttachingFile] = useState(false);

  // Fetch initial note & subjects
  const fetchNote = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/notes/${noteId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat catatan");

      setNote(data.note);
      setTitle(data.note.title || "Catatan Tanpa Judul");
      setSelectedSubjectId(data.note.subject_id || "");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan server";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json();
        if (res.ok && data.subjects) {
          setSubjects(data.subjects);
        }
      } catch (err) {
        console.error("Gagal memuat mapel:", err);
      }
    }
    loadSubjects();
  }, []);

  // Autosave handler for note (title, content, subject_id)
  const triggerSave = useCallback(
    (newTitle?: string, newContent?: Record<string, unknown>, newSubId?: string) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      setSaveStatus("saving");

      saveTimerRef.current = setTimeout(async () => {
        try {
          const bodyPayload: Record<string, unknown> = {};
          if (newTitle !== undefined) bodyPayload.title = newTitle;
          if (newContent !== undefined) bodyPayload.content = newContent;
          if (newSubId !== undefined) bodyPayload.subject_id = newSubId || null;

          const res = await fetch(`/api/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
          });

          if (!res.ok) throw new Error("Gagal menyimpan catatan");
          setSaveStatus("saved");
        } catch (err) {
          console.error("Autosave error:", err);
          setSaveStatus("error");
        }
      }, 750);
    },
    [noteId]
  );

  // Handle Title change
  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerSave(val, undefined, undefined);
  };

  // Handle Editor content change
  const handleContentChange = (json: Record<string, unknown>) => {
    triggerSave(undefined, json, undefined);
  };

  // Handle Subject change
  const handleSubjectChange = (newSubId: string) => {
    setSelectedSubjectId(newSubId);
    triggerSave(undefined, undefined, newSubId);
  };

  // --- TAG MANAGEMENT ---
  const handleAddTag = async () => {
    const tagText = newTagInput.trim().replace(/^#/, "");
    if (!tagText) return;
    if (note?.tags.includes(tagText)) {
      setNewTagInput("");
      return;
    }

    try {
      setAddingTag(true);
      const res = await fetch(`/api/notes/${noteId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: tagText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah tag");

      setNote((prev) => (prev ? { ...prev, tags: [...prev.tags, tagText] } : prev));
      setNewTagInput("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menambah tag");
    } finally {
      setAddingTag(false);
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    try {
      const res = await fetch(
        `/api/notes/${noteId}/tags?tag=${encodeURIComponent(tagToDelete)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus tag");
      }
      setNote((prev) =>
        prev ? { ...prev, tags: prev.tags.filter((t) => t !== tagToDelete) } : prev
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus tag");
    }
  };

  // --- NOTE LINKING ---
  const searchNoteCandidates = async (query: string) => {
    setLinkSearchQuery(query);
    if (!query.trim()) {
      setLinkCandidates([]);
      setShowLinkDropdown(false);
      return;
    }

    try {
      setSearchingCandidates(true);
      const res = await fetch(`/api/notes/${noteId}/links?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (res.ok && data.notes) {
        // Exclude notes already linked
        const existingLinkedIds = new Set((note?.links || []).map((l) => l.target_note_id));
        const filtered = data.notes.filter(
          (n: { id: string; title: string; subject?: Subject }) => !existingLinkedIds.has(n.id)
        );
        setLinkCandidates(filtered);
        setShowLinkDropdown(true);
      }
    } catch (err) {
      console.error("Gagal mencari catatan:", err);
    } finally {
      setSearchingCandidates(false);
    }
  };

  const handleAddLink = async (targetNoteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetNoteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menautkan catatan");

      setNote((prev) =>
        prev
          ? {
              ...prev,
              links: [...prev.links, data.link],
            }
          : prev
      );
      setLinkSearchQuery("");
      setShowLinkDropdown(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menautkan");
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/links?linkId=${linkId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus tautan");
      }
      setNote((prev) =>
        prev ? { ...prev, links: prev.links.filter((l) => l.id !== linkId) } : prev
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus tautan");
    }
  };

  // --- ATTACHMENTS (FILES) ---
  const openAttachmentModal = async () => {
    setShowAttachModal(true);
    try {
      setLoadingFiles(true);
      const res = await fetch("/api/files");
      const data = await res.json();
      if (res.ok && data.files) {
        // Exclude files already attached
        const existingAttachedFileIds = new Set(
          (note?.attachments || []).map((a) => a.file_id).filter(Boolean)
        );
        setAvailableFiles(data.files.filter((f: StudyFile) => !existingAttachedFileIds.has(f.id)));
      }
    } catch (err) {
      console.error("Gagal memuat dokumen:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleAttachFile = async (fileId: string) => {
    try {
      setAttachingFile(true);
      const res = await fetch(`/api/notes/${noteId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melampirkan file");

      setNote((prev) =>
        prev
          ? {
              ...prev,
              attachments: [...prev.attachments, data.attachment],
            }
          : prev
      );
      setShowAttachModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal melampirkan");
    } finally {
      setAttachingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(
        `/api/notes/${noteId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal melepas lampiran");
      }
      setNote((prev) =>
        prev
          ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) }
          : prev
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal melepas lampiran");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
        <Navbar />
        <div className="py-28 flex flex-col items-center justify-center text-zinc-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent-navy dark:text-accent" />
          <p className="text-sm font-medium">Membuka catatan OSN...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl w-fit mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Catatan Tidak Ditemukan
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {error || "Catatan yang kamu cari mungkin telah dihapus atau tidak memiliki akses."}
          </p>
          <Link
            href="/dashboard/notes"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-navy text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Galeri Catatan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border-light dark:border-surface-border-dark">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/notes"
              className="p-2 rounded-xl bg-white dark:bg-surface-card-dark border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              title="Kembali ke Galeri Catatan"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Editor Catatan OSN
                </span>
                {/* Autosave Status Pill */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {saveStatus === "saving" && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-accent-navy dark:text-accent" />
                      <span>Menyimpan...</span>
                    </>
                  )}
                  {saveStatus === "saved" && (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Tersimpan</span>
                    </>
                  )}
                  {saveStatus === "error" && (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span>Gagal Simpan</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title Input Field */}
        <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-4 sm:p-5 shadow-xs">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Judul Catatan Materi (misal: Teorema Bayes & Peluang Lanjutan)..."
            className="w-full text-xl sm:text-2xl font-extrabold bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-hidden placeholder:text-zinc-400"
          />
        </div>

        {/* Main Content Layout: Editor (Left) & Sidebar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Editor Column (Takes 2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <RichTextEditor
              content={note.content}
              onChange={handleContentChange}
              placeholder="Tulis penjabaran rumus, langkah penyelesaian soal olimpiade, atau rangkuman konsep di sini..."
            />
          </div>

          {/* Sidebar Column (Takes 1 col on desktop) */}
          <div className="space-y-6">
            {/* Subject Selector Card */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                <BookOpen className="w-4 h-4 text-accent-navy dark:text-accent" />
                <h3 className="text-sm font-bold">Mata Pelajaran</h3>
              </div>
              <select
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
              >
                <option value="">-- Tanpa Mata Pelajaran (Umum) --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tag Manager Card */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                <TagIcon className="w-4 h-4 text-accent-navy dark:text-accent" />
                <h3 className="text-sm font-bold">Tag Catatan</h3>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {note.tags && note.tags.length > 0 ? (
                  note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag)}
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                        title="Hapus Tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400 italic">Belum ada tag ditambahkan</span>
                )}
              </div>

              {/* Add Tag Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Tambah tag (misal: kinematika)..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={addingTag || !newTagInput.trim()}
                  className="px-3 py-1.5 rounded-xl bg-accent-navy text-white text-xs font-semibold hover:bg-accent-navy/90 disabled:opacity-40 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Note Links Card ("Catatan Terkait") */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                  <Link2 className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold">Catatan Terkait</h3>
                </div>
                <span className="text-[11px] text-zinc-400 font-semibold">
                  {note.links.length} Tautan
                </span>
              </div>

              {/* Linked Notes List */}
              <div className="space-y-2">
                {note.links.length > 0 ? (
                  note.links.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 text-xs"
                    >
                      <Link
                        href={`/dashboard/notes/${link.target_note_id}`}
                        className="font-semibold text-zinc-800 dark:text-zinc-200 hover:text-accent-navy dark:hover:text-accent-light line-clamp-1 flex-1 flex items-center gap-1.5"
                      >
                        <Link2 className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{link.title}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link.id)}
                        className="text-zinc-400 hover:text-red-500 p-1 transition-colors"
                        title="Hapus Tautan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    Belum ada tautan ke catatan lain.
                  </p>
                )}
              </div>

              {/* Autocomplete Link Input */}
              <div className="relative pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={linkSearchQuery}
                    onChange={(e) => searchNoteCandidates(e.target.value)}
                    onFocus={() => {
                      if (linkCandidates.length > 0) setShowLinkDropdown(true);
                    }}
                    placeholder="Tautkan catatan lain (cari judul)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                  />
                  {searchingCandidates && (
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showLinkDropdown && linkCandidates.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto p-1 space-y-1">
                    {linkCandidates.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => handleAddLink(cand.id)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 text-zinc-800 dark:text-zinc-200 transition-colors"
                      >
                        <span className="font-medium truncate">{cand.title}</span>
                        {cand.subject && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold shrink-0"
                            style={{
                              backgroundColor: `${cand.subject.color}15`,
                              color: cand.subject.color,
                            }}
                          >
                            {cand.subject.name}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Note Attachments Card ("Lampiran Materi & Coretan") */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl border border-surface-border-light dark:border-surface-border-dark p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                  <Paperclip className="w-4 h-4 text-accent-navy dark:text-accent" />
                  <h3 className="text-sm font-bold">Lampiran Dokumen</h3>
                </div>
                <button
                  type="button"
                  onClick={openAttachmentModal}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-navy dark:text-accent hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lampirkan</span>
                </button>
              </div>

              {/* Attachments List */}
              <div className="space-y-2">
                {note.attachments && note.attachments.length > 0 ? (
                  note.attachments.map((att) => {
                    const file = att.file;
                    const isPdf = file?.file_type === "pdf";

                    return (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="p-1.5 rounded-lg bg-accent-navy/10 dark:bg-accent-subtle-dark text-accent-navy dark:text-accent-light shrink-0">
                              {isPdf ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                            </span>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                              {file?.file_name || "Dokumen Materi"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="text-zinc-400 hover:text-red-500 p-1 transition-colors shrink-0"
                            title="Lepas Lampiran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Interactive Action Badges */}
                        {file && (
                          <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/40 text-[11px]">
                            <Link
                              href={`/dashboard/files/${file.id}/annotate`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium hover:text-accent-navy dark:hover:text-accent-light border border-zinc-200 dark:border-zinc-600 transition-colors"
                            >
                              <PenTool className="w-3 h-3 text-accent-navy dark:text-accent" />
                              <span>Buka Coretan</span>
                            </Link>

                            <Link
                              href={`/dashboard/files/${file.id}/recall`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium hover:text-accent-navy dark:hover:text-accent-light border border-zinc-200 dark:border-zinc-600 transition-colors"
                            >
                              <Brain className="w-3 h-3 text-amber-500" />
                              <span>Active Recall</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    Belum ada dokumen yang dilampirkan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Attach File Modal Dialog */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-accent-navy dark:text-accent" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Pilih Dokumen Materi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Pilih dokumen atau gambar yang telah kamu unggah di modul Materi untuk ditautkan langsung ke catatan ini.
            </p>

            {loadingFiles ? (
              <div className="py-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-accent-navy dark:text-accent" />
                <span className="text-xs">Memuat dokumen materi...</span>
              </div>
            ) : availableFiles.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-zinc-400 italic">
                  Tidak ada dokumen lain yang tersedia untuk dilampirkan.
                </p>
                <Link
                  href="/dashboard/files"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Unggah Materi Baru</span>
                </Link>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {availableFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 hover:border-accent-navy/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="p-1.5 rounded-lg bg-accent-navy/10 text-accent-navy dark:text-accent-light shrink-0">
                        {file.file_type === "pdf" ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </span>
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {file.file_name}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={attachingFile}
                      onClick={() => handleAttachFile(file.id)}
                      className="px-3 py-1.5 rounded-lg bg-accent-navy text-white text-xs font-semibold hover:bg-accent-navy/90 disabled:opacity-40 transition-all shrink-0 ml-2"
                    >
                      Pilih
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
