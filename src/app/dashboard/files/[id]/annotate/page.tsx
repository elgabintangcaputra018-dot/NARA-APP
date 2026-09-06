"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import AnnotatorCanvas from "@/components/AnnotatorCanvas";
import { StudyFile, AnnotationRecord, DiagramLabel } from "@/lib/db";
import {
  saveAnnotationLocal,
  deleteAnnotationLocal,
  getAnnotationsLocal,
  syncPendingAnnotations,
  cacheFileLocal,
  getCachedFileLocal,
} from "@/lib/offline-sync";
import { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Wifi,
  WifiOff,
  ArrowLeft,
  Loader2,
  Tag,
  Brain,
  Trash2,
  X,
  Check,
} from "lucide-react";

export default function AnnotatePage({ params }: { params: { id: string } }) {
  const fileId = params.id;

  const [file, setFile] = useState<StudyFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // PDF & Page Navigation
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDocProxy, setPdfDocProxy] = useState<PDFDocumentProxy | null>(null);

  // Document render dimensions
  const [docDimensions, setDocDimensions] = useState({ width: 800, height: 1100 });
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Annotations on current page
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationRecord[]>([]);

  // Export states
  const [exporting, setExporting] = useState(false);

  // Diagram Active Recall Label Marking States
  const [labelMode, setLabelMode] = useState(false);
  const [labels, setLabels] = useState<DiagramLabel[]>([]);
  const [isMarkingBox, setIsMarkingBox] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{
    area_x: number;
    area_y: number;
    area_width: number;
    area_height: number;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [labelText, setLabelText] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);

  // Fetch Diagram Labels
  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch(`/api/files/${fileId}/labels`);
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels || []);
      }
    } catch (err) {
      console.warn("Gagal memuat diagram labels:", err);
    }
  }, [fileId]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Handle Save New Label
  const handleSaveLabel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!labelText.trim() || !pendingCoords) return;

    try {
      setSavingLabel(true);
      const res = await fetch(`/api/files/${fileId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingCoords,
          page_number: currentPage,
          label_text: labelText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.label) {
          setLabels((prev) => [...prev, data.label]);
        }
        setModalOpen(false);
        setLabelText("");
        setPendingCoords(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Gagal menyimpan label titik.");
      }
    } catch (err) {
      console.error("Gagal simpan label:", err);
      alert("Terjadi kesalahan saat menyimpan label titik.");
    } finally {
      setSavingLabel(false);
    }
  };

  // Handle Delete Label
  const handleDeleteLabel = async (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/files/${fileId}/labels/${labelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLabels((prev) => prev.filter((l) => l.id !== labelId));
      } else {
        alert("Gagal menghapus label.");
      }
    } catch (err) {
      console.error("Gagal menghapus label:", err);
    }
  };

  // Pointer events for dragging bounding box in label mode
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!labelMode) return;
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = Math.max(0, Math.min(docDimensions.width, e.clientX - rect.left));
    const py = Math.max(0, Math.min(docDimensions.height, e.clientY - rect.top));

    setIsMarkingBox(true);
    setDragStart({ x: px, y: py });
    setCurrentBox({ x: px, y: py, w: 0, h: 0 });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!labelMode || !isMarkingBox || !dragStart) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = Math.max(0, Math.min(docDimensions.width, e.clientX - rect.left));
    const py = Math.max(0, Math.min(docDimensions.height, e.clientY - rect.top));

    const minX = Math.min(dragStart.x, px);
    const minY = Math.min(dragStart.y, py);
    const w = Math.abs(px - dragStart.x);
    const h = Math.abs(py - dragStart.y);

    setCurrentBox({ x: minX, y: minY, w, h });
  };

  const handlePointerUp = () => {
    if (!labelMode || !isMarkingBox) return;
    setIsMarkingBox(false);

    if (currentBox && currentBox.w >= 20 && currentBox.h >= 20) {
      const norm = {
        area_x: currentBox.x / docDimensions.width,
        area_y: currentBox.y / docDimensions.height,
        area_width: currentBox.w / docDimensions.width,
        area_height: currentBox.h / docDimensions.height,
      };
      setPendingCoords(norm);
      setLabelText("");
      setModalOpen(true);
    }

    setDragStart(null);
    setCurrentBox(null);
  };

  // Background Sync Engine Trigger
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      setSyncing(true);
      const result = await syncPendingAnnotations(fileId);
      if (result.syncedCount > 0 || result.conflictsCount > 0) {
        setSyncMessage(`Tersinkron: ${result.syncedCount} coretan.`);
        setTimeout(() => setSyncMessage(null), 3500);
      }
      // Refresh local list
      const fresh = await getAnnotationsLocal(fileId, currentPage);
      setPageAnnotations(fresh);
    } catch (err) {
      console.warn("Background sync error:", err);
    } finally {
      setSyncing(false);
    }
  }, [fileId, currentPage]);

  // Online / Offline event listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync]);

  // Fetch file details (local IndexedDB cache first, then API)
  useEffect(() => {
    const loadFileData = async () => {
      try {
        setLoading(true);

        // Try reading from offline cache first
        const cached = await getCachedFileLocal(fileId);
        if (cached) {
          setFile(cached.file);
        }

        // Fetch fresh metadata from API if online
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
        console.warn("Error loading file:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFileData();
  }, [fileId]);

  // Load PDF document if file_type === 'pdf'
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
        console.warn("Gagal merender PDF melalui pdfjs:", err);
      }
    };

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current page (PDF or Image) onto background canvas
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
        console.error("Error rendering PDF page:", err);
      }
    } else if (file.file_type === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = file.storage_path;
      img.onload = () => {
        // Calculate proportional scale max 900px wide
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

  // Load annotations for current page (IndexedDB first, then server merge)
  const loadPageAnnotations = useCallback(async () => {
    try {
      // 1. Instant local load
      const local = await getAnnotationsLocal(fileId, currentPage);
      setPageAnnotations(local);

      // 2. Fetch server if online
      if (navigator.onLine) {
        const res = await fetch(`/api/files/${fileId}/annotations?page=${currentPage}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.annotations)) {
            // Save server items to IndexedDB & update state
            for (const item of data.annotations) {
              await saveAnnotationLocal(item);
            }
            const updated = await getAnnotationsLocal(fileId, currentPage);
            setPageAnnotations(updated);
          }
        }
      }
    } catch (err) {
      console.warn("Gagal sinkronisasi anotasi halaman:", err);
    }
  }, [fileId, currentPage]);

  useEffect(() => {
    loadPageAnnotations();
  }, [loadPageAnnotations]);

  // Handle local save & background sync
  const handleSaveAnnotation = async (anno: AnnotationRecord) => {
    await saveAnnotationLocal(anno);
    setPageAnnotations((prev) => [...prev.filter((a) => a.id !== anno.id), anno]);

    // Trigger background sync if online
    if (navigator.onLine) {
      triggerSync();
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    await deleteAnnotationLocal(id);
    setPageAnnotations((prev) => prev.filter((a) => a.id !== id));

    // Also attempt deletion on server if online
    if (navigator.onLine) {
      // Background sync will reconcile
      triggerSync();
    }
  };

  // Page Navigation
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // ==========================================
  // EXPORT FEATURE: PNG & PDF
  // ==========================================

  // Export Single Page as PNG
  const handleExportPNG = async () => {
    try {
      setExporting(true);
      const bgCanvas = bgCanvasRef.current;
      if (!bgCanvas) return;

      // Create composite canvas
      const compCanvas = document.createElement("canvas");
      compCanvas.width = docDimensions.width;
      compCanvas.height = docDimensions.height;
      const ctx = compCanvas.getContext("2d");
      if (!ctx) return;

      // 1. Draw background document
      ctx.drawImage(bgCanvas, 0, 0);

      // 2. Draw annotations
      for (const anno of pageAnnotations) {
        if (!anno.layer_visible) continue;
        ctx.save();
        const path = new Path2D(anno.svg_path);
        if (anno.stroke_type === "highlight") {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = anno.color;
          ctx.lineWidth = anno.stroke_width;
          ctx.lineCap = "square";
        } else {
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = anno.color;
          ctx.lineWidth = anno.stroke_width;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
        }
        ctx.stroke(path);
        ctx.restore();
      }

      // 3. Download link
      const dataUrl = compCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${file?.file_name || "nara_catatan"}_hal_${currentPage}.png`;
      a.click();
    } catch (err) {
      console.error("Export PNG error:", err);
      alert("Gagal mengekspor gambar");
    } finally {
      setExporting(false);
    }
  };

  // Export Full Document as PDF (pdf-lib)
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const pdfDoc = await PDFDocument.create();

      // For the current page, capture high-res snapshot
      const bgCanvas = bgCanvasRef.current;
      if (!bgCanvas) return;

      const compCanvas = document.createElement("canvas");
      compCanvas.width = docDimensions.width;
      compCanvas.height = docDimensions.height;
      const ctx = compCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(bgCanvas, 0, 0);
      for (const anno of pageAnnotations) {
        if (!anno.layer_visible) continue;
        ctx.save();
        const path = new Path2D(anno.svg_path);
        if (anno.stroke_type === "highlight") {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = anno.color;
          ctx.lineWidth = anno.stroke_width;
        } else {
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = anno.color;
          ctx.lineWidth = anno.stroke_width;
        }
        ctx.stroke(path);
        ctx.restore();
      }

      const pngDataUrl = compCanvas.toDataURL("image/png");
      const pngImageBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(pngImageBytes);

      const page = pdfDoc.addPage([docDimensions.width, docDimensions.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: docDimensions.width,
        height: docDimensions.height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${file?.file_name || "nara_catatan"}_anotasi.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("Gagal mengekspor PDF");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-light dark:bg-surface-dark space-y-3">
        <NaraMascot pose="focus" size="md" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span>Menyiapkan Ruang Anotasi...</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 transition-colors">
      <Navbar />

      {/* Sub-Header & Controls Bar */}
      <div className="bg-white dark:bg-surface-card-dark border-b border-surface-border-light dark:border-surface-border-dark px-4 sm:px-6 py-3 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* File Title & Back */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href="/dashboard/files"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Kembali ke Galeri Materi"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 truncate max-w-xs sm:max-w-md">
                {file?.file_name || "Ruang Anotasi"}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="uppercase font-semibold">{file?.file_type}</span>
                <span>•</span>
                {/* Online / Offline Status Badge */}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Wifi className="w-3 h-3" />
                    <span>Online (Tersinkron)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline (Tersimpan Lokal)</span>
                  </span>
                )}
                {syncing && <Loader2 className="w-3 h-3 animate-spin text-accent ml-1" />}
                {syncMessage && <span className="text-emerald-600 font-medium">{syncMessage}</span>}
              </div>
            </div>
          </div>

          {/* Navigation for Multi-page PDF */}
          {file?.file_type === "pdf" && numPages > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold px-2 text-zinc-700 dark:text-zinc-300">
                Hal {currentPage} / {numPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right Actions: Label Mode, Active Recall, Exports & Mascot */}
          <div className="flex items-center gap-2">
            {/* Toggle Mode Tandai Label */}
            <button
              type="button"
              id="btn-toggle-label-mode"
              onClick={() => setLabelMode(!labelMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs border ${
                labelMode
                  ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40"
                  : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-400"
              }`}
              title="Tandai Titik Penting untuk Active Recall"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{labelMode ? "Mode Tandai: Aktif" : "Tandai Label"}</span>
              {labels.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    labelMode ? "bg-amber-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {labels.length}
                </span>
              )}
            </button>

            {/* Mulai Active Recall Link */}
            <Link
              href={`/dashboard/files/${fileId}/recall`}
              id="btn-goto-recall"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-all shadow-xs"
              title="Uji Pemahaman dengan Active Recall"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Active Recall</span>
              {labels.length > 0 && (
                <span className="bg-emerald-700/80 text-[10px] px-1.5 py-0.2 rounded-full">
                  {labels.length}
                </span>
              )}
            </Link>

            {/* Export PNG */}
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={exporting}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition-all shadow-xs"
              title="Unduh Gambar Anotasi Halaman Ini (PNG)"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PNG</span>
            </button>

            {/* Export PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-3 py-1.5 rounded-xl bg-accent-navy text-white hover:bg-accent-navy-light text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
              title="Unduh Dokumen Beranotasi (PDF)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Stage */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col items-center">
        {/* Label Mode Helper Banner */}
        {labelMode && (
          <div className="w-full max-w-5xl mb-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 animate-fadeIn shadow-xs">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Mode Tandai Titik Aktif:</strong> Tarik (drag) kotak di atas diagram untuk menandai titik penting yang akan diuji di Active Recall.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLabelMode(false)}
              className="text-amber-700 dark:text-amber-300 hover:underline font-bold text-xs"
            >
              Selesai Menandai
            </button>
          </div>
        )}

        {/* Render Container: Background Doc Canvas + Foreground Annotator Canvas + Diagram Labels */}
        <div
          ref={containerRef}
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

          {/* Foreground Transparent Overlay Canvas with Drawing Tools */}
          <div className={`absolute top-0 left-0 z-10 w-full h-full ${labelMode ? "pointer-events-none" : ""}`}>
            <AnnotatorCanvas
              width={docDimensions.width}
              height={docDimensions.height}
              pageNumber={currentPage}
              fileId={fileId}
              initialAnnotations={pageAnnotations}
              onSaveAnnotation={handleSaveAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          </div>

          {/* Diagram Labels Overlay on Current Page */}
          {labels
            .filter((l) => !l.page_number || l.page_number === currentPage)
            .map((label, idx) => {
              const left = label.area_x * docDimensions.width;
              const top = label.area_y * docDimensions.height;
              const width = label.area_width * docDimensions.width;
              const height = label.area_height * docDimensions.height;

              return (
                <div
                  key={label.id}
                  className={`absolute z-15 pointer-events-auto rounded-lg border-2 border-dashed transition-all flex flex-col justify-start ${
                    labelMode
                      ? "border-amber-500 bg-amber-500/20 ring-2 ring-amber-400/30"
                      : "border-indigo-500/80 bg-indigo-500/10"
                  }`}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                >
                  <div className="bg-amber-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-br-md rounded-tl-md self-start flex items-center gap-1 shadow-xs truncate max-w-full">
                    <span className="w-3.5 h-3.5 rounded-full bg-white/30 text-center leading-3 font-mono text-[9px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate">{label.label_text}</span>
                    {labelMode && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLabel(label.id, e)}
                        className="ml-1 p-0.5 hover:bg-amber-700 rounded text-white"
                        title="Hapus Label Ini"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Label Drag Interactor (Active only in labelMode) */}
          {labelMode && (
            <div
              className="absolute inset-0 z-20 cursor-crosshair select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Active Dragging Rectangle */}
              {currentBox && isMarkingBox && (
                <div
                  className="absolute border-2 border-dashed border-amber-500 bg-amber-500/25 rounded-lg pointer-events-none"
                  style={{
                    left: `${currentBox.x}px`,
                    top: `${currentBox.y}px`,
                    width: `${currentBox.w}px`,
                    height: `${currentBox.h}px`,
                  }}
                >
                  <span className="absolute -top-6 left-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                    Area Baru...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Input Label Text */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent-navy dark:text-accent">
                  <Tag className="w-5 h-5" />
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    Beri Nama Titik Label Diagram
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setPendingCoords(null);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Area titik telah ditandai. Tuliskan nama atau istilah ilmiah yang harus ditebak saat sesi Active Recall.
              </p>

              <form onSubmit={handleSaveLabel} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Nama Label / Kunci Jawaban
                  </label>
                  <input
                    type="text"
                    id="input-label-text"
                    autoFocus
                    value={labelText}
                    onChange={(e) => setLabelText(e.target.value)}
                    placeholder="Contoh: Mitokondria, Membran Sel, Hukum Ohm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-accent"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setPendingCoords(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="btn-save-label"
                    disabled={savingLabel || !labelText.trim()}
                    className="px-5 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-light disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
                  >
                    {savingLabel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Simpan Titik Label</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
