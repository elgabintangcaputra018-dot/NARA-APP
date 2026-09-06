"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import { StudyFile, DiagramLabel, RecallAttempt } from "@/lib/db";
import { getCachedFileLocal, cacheFileLocal } from "@/lib/offline-sync";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowLeft,
  Check,
  X,
  Brain,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
} from "lucide-react";

interface LabelWithAttempt extends DiagramLabel {
  lastAttempt?: RecallAttempt | null;
}

export default function RecallPage({ params }: { params: { id: string } }) {
  const fileId = params.id;

  const [file, setFile] = useState<StudyFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<LabelWithAttempt[]>([]);
  const [totalLabels, setTotalLabels] = useState(0);
  const [masteredLabels, setMasteredLabels] = useState(0);
  const [allMastered, setAllMastered] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // PDF & Page Navigation
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDocProxy, setPdfDocProxy] = useState<PDFDocumentProxy | null>(null);

  // Canvas Dimensions
  const [docDimensions, setDocDimensions] = useState({ width: 800, height: 1100 });
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active quiz modal for a selected label
  const [activeLabel, setActiveLabel] = useState<LabelWithAttempt | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [attemptFeedback, setAttemptFeedback] = useState<{
    correct: boolean;
    correctText: string;
  } | null>(null);

  // Load File Details
  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true);
        // Offline cache first
        const cached = await getCachedFileLocal(fileId);
        if (cached) {
          setFile(cached.file);
        }

        if (navigator.onLine) {
          const res = await fetch(`/api/files/${fileId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.file) {
              setFile(data.file);
              await cacheFileLocal(data.file);
            }
          }
        }
      } catch (err) {
        console.warn("Gagal memuat detail file:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [fileId]);

  // Load PDF Proxy if applicable
  useEffect(() => {
    if (!file || file.file_type !== "pdf") return;

    let isMounted = true;
    const loadPdf = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

        const pdfUrl = file.storage_path;
        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (isMounted) {
          setPdfDocProxy(pdf);
          setNumPages(pdf.numPages);
        }
      } catch (err) {
        console.warn("Gagal merender PDF via pdfjs:", err);
      }
    };

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render Background Document Canvas
  const renderBackground = useCallback(async () => {
    if (!file) return;

    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext("2d");
    if (!ctx) return;

    if (file.file_type === "pdf" && pdfDocProxy) {
      try {
        const page = await pdfDocProxy.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });

        bgCanvas.width = viewport.width;
        bgCanvas.height = viewport.height;
        setDocDimensions({ width: viewport.width, height: viewport.height });

        ctx.clearRect(0, 0, viewport.width, viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error("Error rendering PDF page for recall:", err);
      }
    } else if (file.file_type === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = file.storage_path;
      img.onload = () => {
        const maxWidth = 900;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        bgCanvas.width = targetWidth;
        bgCanvas.height = targetHeight;
        setDocDimensions({ width: targetWidth, height: targetHeight });

        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      };
    }
  }, [file, pdfDocProxy, currentPage]);

  useEffect(() => {
    renderBackground();
  }, [renderBackground]);

  // Fetch Recall Stats & Labels
  const fetchRecallStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/files/${fileId}/recall?page=${currentPage}`);
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels || []);
        setTotalLabels(data.totalLabels || 0);
        setMasteredLabels(data.masteredLabels || 0);
        setAllMastered(Boolean(data.allMastered));

        if (data.allMastered && data.totalLabels > 0) {
          setShowCelebration(true);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat recall stats:", err);
    }
  }, [fileId, currentPage]);

  useEffect(() => {
    fetchRecallStats();
  }, [fetchRecallStats]);

  // Open Quiz Modal for a Label
  const handleOpenQuiz = (label: LabelWithAttempt) => {
    setActiveLabel(label);
    setGuessInput("");
    setRevealedAnswer(false);
    setAttemptFeedback(null);
  };

  // Submit Answer (Automatic Check)
  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLabel || !guessInput.trim() || submittingAttempt) return;

    try {
      setSubmittingAttempt(true);
      const res = await fetch(`/api/files/${fileId}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelId: activeLabel.id,
          userAnswer: guessInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAttemptFeedback({
          correct: data.correct,
          correctText: data.label_text,
        });
        setRevealedAnswer(true);

        // Update local label attempt state
        setLabels((prev) =>
          prev.map((l) =>
            l.id === activeLabel.id
              ? {
                  ...l,
                  lastAttempt: {
                    id: `temp_${Date.now()}`,
                    workspace_id: l.workspace_id,
                    diagram_label_id: l.id,
                    correct: data.correct,
                    user_answer: guessInput.trim(),
                    attempted_at: new Date().toISOString(),
                  },
                }
              : l
          )
        );

        setMasteredLabels(data.masteredLabels);
        setTotalLabels(data.totalLabels);
        if (data.allMastered) {
          setAllMastered(true);
          setTimeout(() => setShowCelebration(true), 1200);
        }
      }
    } catch (err) {
      console.error("Gagal submit recall attempt:", err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  // Submit Answer (Manual Self-Grading)
  const handleSelfGrade = async (isCorrect: boolean) => {
    if (!activeLabel || submittingAttempt) return;

    try {
      setSubmittingAttempt(true);
      const res = await fetch(`/api/files/${fileId}/recall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labelId: activeLabel.id,
          isCorrect,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAttemptFeedback({
          correct: isCorrect,
          correctText: data.label_text,
        });
        setRevealedAnswer(true);

        setLabels((prev) =>
          prev.map((l) =>
            l.id === activeLabel.id
              ? {
                  ...l,
                  lastAttempt: {
                    id: `temp_${Date.now()}`,
                    workspace_id: l.workspace_id,
                    diagram_label_id: l.id,
                    correct: isCorrect,
                    attempted_at: new Date().toISOString(),
                  },
                }
              : l
          )
        );

        setMasteredLabels(data.masteredLabels);
        setTotalLabels(data.totalLabels);
        if (data.allMastered) {
          setAllMastered(true);
          setTimeout(() => setShowCelebration(true), 1200);
        }
      }
    } catch (err) {
      console.error("Gagal submit self grade:", err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  // Reset Session (Re-attempt labels fresh)
  const handleResetSession = () => {
    // Reset local view attempts
    setLabels((prev) =>
      prev.map((l) => ({
        ...l,
        lastAttempt: null,
      }))
    );
    setMasteredLabels(0);
    setAllMastered(false);
    setShowCelebration(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark space-y-3">
        <NaraMascot pose="focus" size="md" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span>Memuat Sesi Active Recall Diagram...</span>
        </p>
      </div>
    );
  }

  const progressPercent = totalLabels > 0 ? Math.round((masteredLabels / totalLabels) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <Navbar />

      {/* Sub-Header & Recall Statistics */}
      <div className="bg-white dark:bg-surface-card-dark border-b border-surface-border-light dark:border-surface-border-dark px-4 sm:px-6 py-3 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Back to Annotate & File Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href={`/dashboard/files/${fileId}/annotate`}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Kembali ke Ruang Anotasi"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Brain className="w-4 h-4" />
                </span>
                <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                  Active Recall: {file?.file_name || "Diagram"}
                </h1>
              </div>
              <p className="text-[11px] text-zinc-500">
                Tebak istilah pada kotak tertutup untuk memperkuat memori jangka panjang.
              </p>
            </div>
          </div>

          {/* Center: Dynamic Mastery Progress */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-center">
            <div className="flex flex-col items-center sm:items-start min-w-[200px]">
              <div className="flex items-center justify-between w-full text-xs font-bold mb-1">
                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-accent-gold" />
                  <span id="recall-mastery-text">{masteredLabels}/{totalLabels} label dikuasai</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold inline-flex items-center gap-1">
                  {allMastered && <Sparkles className="w-3 h-3 text-accent-gold" />}
                  <span>{progressPercent}%</span>
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Page Navigation for Multi-page PDF */}
            {file?.file_type === "pdf" && numPages > 1 && (
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 text-zinc-700 dark:text-zinc-300">
                  {currentPage}/{numPages}
                </span>
                <button
                  type="button"
                  onClick={() => currentPage < numPages && setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= numPages}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Actions (Restart, Edit Labels) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-restart-recall"
              onClick={handleResetSession}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition-all shadow-xs"
              title="Ulangi Latihan dari Awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Latihan</span>
            </button>

            <Link
              href={`/dashboard/files/${fileId}/annotate`}
              className="px-3.5 py-1.5 rounded-xl bg-accent text-white hover:bg-accent-light text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Edit Titik</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Recall Stage */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col items-center">
        {/* Zero Labels Notice */}
        {totalLabels === 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md text-center shadow-lg my-8 space-y-4">
            <NaraMascot pose="thinking" size="md" className="mx-auto" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Belum Ada Titik Diagram yang Ditandai
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Sebelum memulai sesi Active Recall, tandai titik atau bagian penting pada diagram terlebih dahulu melalui Ruang Anotasi.
            </p>
            <Link
              href={`/dashboard/files/${fileId}/annotate`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-sm shadow-md hover:bg-accent-light transition-all"
            >
              <span>Buka Ruang Anotasi & Tandai</span>
            </Link>
          </div>
        )}

        {/* Document Viewer with Occlusion Masks */}
        {totalLabels > 0 && (
          <div
            className="relative rounded-2xl shadow-xl overflow-hidden bg-white dark:bg-zinc-900 border border-surface-border-light dark:border-surface-border-dark"
            style={{ width: docDimensions.width, height: docDimensions.height }}
          >
            {/* Background Canvas: renders PDF page or image */}
            <canvas
              ref={bgCanvasRef}
              width={docDimensions.width}
              height={docDimensions.height}
              className="absolute top-0 left-0 pointer-events-none z-0"
            />

            {/* Occlusion Boxes Overlay */}
            {labels
              .filter((l) => !l.page_number || l.page_number === currentPage)
              .map((label, idx) => {
                const left = label.area_x * docDimensions.width;
                const top = label.area_y * docDimensions.height;
                const width = label.area_width * docDimensions.width;
                const height = label.area_height * docDimensions.height;

                const isAnswered = Boolean(label.lastAttempt);
                const isCorrect = label.lastAttempt?.correct === true;

                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleOpenQuiz(label)}
                    className={`occlusion-box absolute z-10 rounded-lg p-1.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none group shadow-md ${
                      !isAnswered
                        ? "bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 hover:border-accent hover:scale-[1.01]"
                        : isCorrect
                        ? "bg-emerald-600/90 text-white border-2 border-emerald-400 shadow-emerald-500/20"
                        : "bg-rose-600/90 text-white border-2 border-rose-400 shadow-rose-500/20"
                    }`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    title={
                      !isAnswered
                        ? `Titik #${idx + 1} - Klik untuk menebak`
                        : isCorrect
                        ? `Benar! ${label.label_text}`
                        : `Salah. Kunci: ${label.label_text}`
                    }
                  >
                    {!isAnswered ? (
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <span className="w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[11px] font-mono border border-slate-600">
                          {idx + 1}
                        </span>
                        <HelpCircle className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full px-1">
                        <div className="flex items-center gap-1 font-extrabold text-xs">
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                          )}
                          <span className="truncate max-w-full font-bold">{label.label_text}</span>
                        </div>
                        <span className="text-[10px] opacity-85 mt-0.5">
                          {isCorrect ? "Dikuasai ✓" : "Perlu Diulang ✗"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        )}

        {/* Quiz Modal Popover */}
        {activeLabel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-accent-navy text-white font-mono font-bold text-sm flex items-center justify-center">
                    #
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      Tebak Nama Bagian Ini
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Uji daya ingatmu dengan menebak nama atau konsep titik diagram ini.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLabel(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Feedback State if already attempted */}
              {attemptFeedback ? (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    attemptFeedback.correct
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
                  }`}
                >
                  {attemptFeedback.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm">
                      {attemptFeedback.correct ? "Hebat! Jawabanmu Benar!" : "Belum Tepat!"}
                    </p>
                    <p className="text-xs">
                      Kunci Jawaban: <strong>{attemptFeedback.correctText}</strong>
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Option 1: Type Guess & Submit (Auto Grading) */}
              {!revealedAnswer && !attemptFeedback && (
                <form onSubmit={handleSubmitGuess} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Ketik Nama Titik:
                    </label>
                    <input
                      type="text"
                      id="input-recall-guess"
                      autoFocus
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Ketik jawabanmu di sini..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-guess"
                    disabled={submittingAttempt || !guessInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent-light disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    {submittingAttempt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Periksa Jawaban</span>
                  </button>
                </form>
              )}

              {/* Reveal Answer Button */}
              {!revealedAnswer && !attemptFeedback && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Lupa atau ingin cek mandiri?</span>
                  <button
                    type="button"
                    id="btn-reveal-answer"
                    onClick={() => setRevealedAnswer(true)}
                    className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Buka Kunci Jawaban</span>
                  </button>
                </div>
              )}

              {/* Option 2: Self-Grading Buttons when answer is revealed */}
              {revealedAnswer && !attemptFeedback && (
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      Kunci Jawaban Asli
                    </span>
                    <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                      {activeLabel.label_text}
                    </p>
                  </div>

                  <p className="text-xs text-center text-zinc-600 dark:text-zinc-400 font-medium">
                    Bagaimana ingatanmu? Beri penilaian mandiri:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="btn-self-wrong"
                      onClick={() => handleSelfGrade(false)}
                      disabled={submittingAttempt}
                      className="py-2.5 px-4 rounded-xl border border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 inline-flex items-center justify-center gap-1.5 transition-all"
                    >
                      <X className="w-4 h-4" />
                      <span>Saya Salah</span>
                    </button>
                    <button
                      type="button"
                      id="btn-self-correct"
                      onClick={() => handleSelfGrade(true)}
                      disabled={submittingAttempt}
                      className="py-2.5 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 inline-flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Saya Benar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Close Button when feedback is shown */}
              {attemptFeedback && (
                <div className="pt-2">
                  <button
                    type="button"
                    id="btn-close-feedback"
                    onClick={() => setActiveLabel(null)}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs hover:opacity-90 transition-all shadow-xs"
                  >
                    Lanjut ke Titik Lain
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 100% Mastery Celebration Modal */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-zinc-900 border-2 border-accent-gold/40 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center space-y-5">
              <NaraMascot pose="success" size="lg" className="mx-auto" />

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-300 dark:border-amber-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>100% Sempurna</span>
                </div>
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  Luar Biasa! Semua Titik Dikuasai! 🎉
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Kamu telah berhasil mengingat dan menguasai seluruh <strong>{totalLabels} label titik penting</strong> pada materi diagram ini. Pemahamanmu semakin matang!
                </p>
              </div>

              <div className="pt-3 flex flex-col gap-2">
                <button
                  type="button"
                  id="btn-celebration-repeat"
                  onClick={handleResetSession}
                  className="w-full py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent-light inline-flex items-center justify-center gap-1.5 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Latihan Ulang Dari Awal</span>
                </button>
                <Link
                  href={`/dashboard/files/${fileId}/annotate`}
                  className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center"
                >
                  <span>Kembali ke Ruang Anotasi</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
