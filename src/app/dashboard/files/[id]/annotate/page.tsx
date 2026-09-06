"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import AnnotatorCanvas from "@/components/AnnotatorCanvas";
import { StudyFile, AnnotationRecord } from "@/lib/db";
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

          {/* Right Actions: Exports & Mascot Focus Badge */}
          <div className="flex items-center gap-2">
            {/* Mascot Focus Companion Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-accent-navy/5 dark:bg-accent-navy/80 border border-accent/30 text-accent-navy dark:text-accent-light shadow-xs">
              <NaraMascot pose="focus" size="sm" />
              <span className="text-xs font-bold">Mode Fokus Aktif</span>
            </div>

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
        {/* Render Container: Background Doc Canvas + Foreground Annotator Canvas */}
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
          <div className="absolute top-0 left-0 z-10 w-full h-full">
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
        </div>
      </main>
    </div>
  );
}
