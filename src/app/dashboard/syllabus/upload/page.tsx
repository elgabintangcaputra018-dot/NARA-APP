"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Subject } from "@/lib/db";
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  Combine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";

interface ParsedTopic {
  id: string;
  title: string;
  weight: number; // 1 to 5
  estimated_minutes: number;
  selected: boolean;
}

export default function SyllabusUploadPage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Form Metadata
  const [title, setTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [deadline, setDeadline] = useState("");

  // Upload & Extraction State
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedTopics, setParsedTopics] = useState<ParsedTopic[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch subjects
  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json();
        if (res.ok && data.subjects) {
          setSubjects(data.subjects);
          if (data.subjects.length > 0) {
            setSelectedSubjectId(data.subjects[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat mapel:", err);
      }
    }
    loadSubjects();
  }, []);

  // Heuristic Regex Parser for Topic Detection
  const parsePdfTextToTopics = (rawText: string): ParsedTopic[] => {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    const chapterRegex = /^(BAB|CHAPTER|BAGIAN)\s+([0-9IVXLCDM]+)[\s:.\-]+(.*)$/i;
    const subtopicRegex = /^([0-9]+\.[0-9]+(\.[0-9]+)?)\s+[\-–:.]?\s*(.*)$/;
    const numberedListRegex = /^([0-9]+|[A-Z])[\.\)]\s+([A-Z0-9].*)$/;

    const detected: ParsedTopic[] = [];

    for (const line of lines) {
      if (chapterRegex.test(line)) {
        detected.push({
          id: `tmp_${Math.random().toString(36).substring(2, 9)}`,
          title: line,
          weight: 3,
          estimated_minutes: 60,
          selected: false,
        });
      } else if (subtopicRegex.test(line)) {
        detected.push({
          id: `tmp_${Math.random().toString(36).substring(2, 9)}`,
          title: line,
          weight: 3,
          estimated_minutes: 45,
          selected: false,
        });
      } else if (numberedListRegex.test(line)) {
        detected.push({
          id: `tmp_${Math.random().toString(36).substring(2, 9)}`,
          title: line,
          weight: 3,
          estimated_minutes: 45,
          selected: false,
        });
      }
    }

    // Fallback: if no patterns matched, take lines starting with uppercase letters
    if (detected.length === 0) {
      lines.slice(0, 20).forEach((l) => {
        if (/^[A-Z]/.test(l) && l.length < 90) {
          detected.push({
            id: `tmp_${Math.random().toString(36).substring(2, 9)}`,
            title: l,
            weight: 3,
            estimated_minutes: 60,
            selected: false,
          });
        }
      });
    }

    return detected;
  };

  // Handle PDF file select & parsing via pdfjs-dist
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }

    try {
      setParsing(true);
      setParseError(null);

      const arrayBuffer = await selectedFile.arrayBuffer();

      // Dynamically import pdfjs-dist
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdfDoc = await loadingTask.promise;

      let fullText = "";
      const maxPages = Math.min(pdfDoc.numPages, 40); // parse up to first 40 pages

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? (item as { str: string }).str : ""))
          .join("\n");
        fullText += pageText + "\n";
      }

      const extracted = parsePdfTextToTopics(fullText);
      if (extracted.length === 0) {
        // Fallback default topic for manual editing
        setParsedTopics([
          {
            id: `tmp_${Date.now()}`,
            title: "Bab 1: Konsep Dasar & Pemahaman Awal",
            weight: 3,
            estimated_minutes: 60,
            selected: false,
          },
        ]);
      } else {
        setParsedTopics(extracted);
      }
    } catch (err: unknown) {
      console.error("Gagal mengekstrak PDF:", err);
      setParseError("Tidak dapat membaca teks langsung dari PDF. Anda dapat menambahkan topik secara manual di bawah.");
      setParsedTopics([
        {
          id: `tmp_${Date.now()}`,
          title: "Topik 1 (Tambahkan manual)",
          weight: 3,
          estimated_minutes: 60,
          selected: false,
        },
      ]);
    } finally {
      setParsing(false);
    }
  };

  // Topic Edit handlers
  const handleTopicTitleChange = (id: string, newTitle: string) => {
    setParsedTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t))
    );
  };

  const handleTopicWeightChange = (id: string, weight: number) => {
    setParsedTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, weight } : t))
    );
  };

  const handleTopicDurationChange = (id: string, minutes: number) => {
    setParsedTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estimated_minutes: minutes } : t))
    );
  };

  const handleDeleteTopic = (id: string) => {
    setParsedTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTopic = () => {
    const newTopic: ParsedTopic = {
      id: `tmp_${Date.now()}`,
      title: `Topik Baru ${parsedTopics.length + 1}`,
      weight: 3,
      estimated_minutes: 60,
      selected: false,
    };
    setParsedTopics((prev) => [...prev, newTopic]);
  };

  const toggleSelectTopic = (id: string) => {
    setParsedTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleMergeSelected = () => {
    const selected = parsedTopics.filter((t) => t.selected);
    if (selected.length < 2) {
      alert("Pilih minimal 2 topik untuk digabungkan.");
      return;
    }

    const mergedTitle = selected.map((t) => t.title).join(" & ");
    const totalMinutes = selected.reduce((sum, t) => sum + t.estimated_minutes, 0);
    const maxWeight = Math.max(...selected.map((t) => t.weight));

    const remaining = parsedTopics.filter((t) => !t.selected);
    const firstSelectedIndex = parsedTopics.findIndex((t) => t.selected);

    const mergedTopic: ParsedTopic = {
      id: `tmp_${Date.now()}`,
      title: mergedTitle,
      weight: maxWeight,
      estimated_minutes: Math.min(180, totalMinutes),
      selected: false,
    };

    const newTopics = [...remaining];
    newTopics.splice(firstSelectedIndex, 0, mergedTopic);
    setParsedTopics(newTopics);
  };

  // Submit and Save Syllabus
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Mohon masukkan judul silabus.");
      return;
    }
    if (!selectedSubjectId) {
      alert("Mohon pilih mata pelajaran.");
      return;
    }
    if (parsedTopics.length === 0) {
      alert("Silabus harus memiliki minimal 1 topik.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject_id: selectedSubjectId,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          topics: parsedTopics.map((t, idx) => ({
            title: t.title.trim(),
            order_index: idx,
            weight: t.weight,
            estimated_minutes: t.estimated_minutes,
            status: "not_started",
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan silabus");

      router.push(`/dashboard/syllabus/${data.syllabus.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Kesalahan server");
      setSaving(false);
    }
  };

  const selectedCount = parsedTopics.filter((t) => t.selected).length;

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard/syllabus"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Galeri Silabus</span>
        </Link>

        {/* Title Header */}
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-accent-navy text-white shadow-xs">
            <Layers className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Unggah &amp; Ekstrak Silabus OSN
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sistem akan membedah bab secara deterministik ($0 AI). Anda bebas mengedit judul, mengatur bobot kesulitan mandiri, dan menggabungkan topik.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Upload Box */}
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent-navy text-white text-[11px] flex items-center justify-center font-bold">1</span>
              <span>Pilih Dokumen Silabus / Buku PDF</span>
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-accent-navy/60 dark:hover:border-accent/60 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col items-center justify-center space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {parsing ? (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-accent-navy dark:text-accent" />
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Mengekstrak struktur bab dari PDF...
                  </p>
                </>
              ) : file ? (
                <>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {file.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Klik untuk memilih file lain (PDF)
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-accent-navy/10 text-accent-navy dark:text-accent rounded-2xl">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      Klik atau seret file PDF silabus ke sini
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Mendukung silabus pembinaan OSN, daftar isi e-book, atau modul latihan
                    </p>
                  </div>
                </>
              )}
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Step 2: Metadata Form */}
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent-navy text-white text-[11px] flex items-center justify-center font-bold">2</span>
              <span>Informasi Silabus &amp; Target Deadline</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Title */}
              <div className="md:col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Judul Silabus
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Silabus OSN Fisika 2026"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Mata Pelajaran
                </label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Target Deadline (Opsional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Editable Topics Table */}
          <div className="bg-white dark:bg-surface-card-dark rounded-3xl border border-surface-border-light dark:border-surface-border-dark p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent-navy text-white text-[11px] flex items-center justify-center font-bold">3</span>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Daftar Topik Silabus ({parsedTopics.length} Topik)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {selectedCount >= 2 && (
                  <button
                    type="button"
                    onClick={handleMergeSelected}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
                  >
                    <Combine className="w-3.5 h-3.5" />
                    <span>Gabung {selectedCount} Topik</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddTopic}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Topik</span>
                </button>
              </div>
            </div>

            {/* Explanatory Banner about Manual Weight */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Bobot Kesulitan Diisi Sendiri (Bebas Biaya AI)</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                  Tentukan tingkat pemahaman Anda pada tiap topik: bobot lebih tinggi (4–5) akan diprioritaskan lebih dulu oleh algoritma auto-jadwal.
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {parsedTopics.map((topic, index) => (
                <div
                  key={topic.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center gap-3 ${
                    topic.selected
                      ? "border-accent-navy bg-accent-navy/5 dark:border-accent dark:bg-accent/5"
                      : "border-zinc-200 dark:border-zinc-700/60 bg-zinc-50/60 dark:bg-zinc-800/40"
                  }`}
                >
                  {/* Select Checkbox & Index */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="checkbox"
                      checked={topic.selected}
                      onChange={() => toggleSelectTopic(topic.id)}
                      className="w-4 h-4 rounded-sm text-accent-navy focus:ring-accent-navy"
                      title="Pilih untuk digabung"
                    />
                    <span className="w-6 text-center text-xs font-bold text-zinc-400">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Topic Title Input */}
                  <input
                    type="text"
                    required
                    value={topic.title}
                    onChange={(e) => handleTopicTitleChange(topic.id, e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                  />

                  {/* Manual Weight Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] text-zinc-400 shrink-0">Bobot:</label>
                    <select
                      value={topic.weight}
                      onChange={(e) => handleTopicWeightChange(topic.id, Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                    >
                      <option value={1}>1 - Sangat Mudah</option>
                      <option value={2}>2 - Mudah</option>
                      <option value={3}>3 - Sedang (Default)</option>
                      <option value={4}>4 - Sulit</option>
                      <option value={5}>5 - Sangat Sulit</option>
                    </select>
                  </div>

                  {/* Estimated Minutes */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <select
                      value={topic.estimated_minutes}
                      onChange={(e) => handleTopicDurationChange(topic.id, Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                    >
                      <option value={30}>30 menit</option>
                      <option value={45}>45 menit</option>
                      <option value={60}>60 menit</option>
                      <option value={90}>90 menit</option>
                      <option value={120}>120 menit</option>
                    </select>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteTopic(topic.id)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
                    title="Hapus topik"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard/syllabus"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={saving || parsedTopics.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-navy text-white text-xs font-bold shadow-md hover:bg-accent-navy/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Silabus...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Silabus &amp; Lanjut Susun Jadwal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
