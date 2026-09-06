"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { AnnotationRecord } from "@/lib/db";
import {
  pointsToSvgPath,
  circleToSvgPath,
  arrowToSvgPath,
  Point,
} from "@/lib/douglas-peucker";
import {
  Pen,
  Highlighter,
  Circle as CircleIcon,
  MoveRight,
  Eraser,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export type ToolType = "pen" | "highlight" | "circle" | "arrow" | "eraser";

interface AnnotatorCanvasProps {
  width: number;
  height: number;
  pageNumber: number;
  fileId: string;
  initialAnnotations: AnnotationRecord[];
  onSaveAnnotation: (anno: AnnotationRecord) => void;
  onDeleteAnnotation: (id: string) => void;
  onClearPage?: () => void;
  readOnly?: boolean;
}

const PEN_COLORS = [
  { name: "Hitam", hex: "#000000" },
  { name: "Nara Blue", hex: "#6B95F1" },
  { name: "Midnight Navy", hex: "#162342" },
  { name: "Hijau OSN", hex: "#22C55E" },
  { name: "Merah Aksen", hex: "#EF4444" },
  { name: "Warm Gold", hex: "#E5A93C" },
];

const HIGHLIGHT_COLORS = [
  { name: "Kuning Cerah", hex: "#FACC15" },
  { name: "Biru Muda", hex: "#93C5FD" },
  { name: "Hijau Neon", hex: "#86EFAC" },
  { name: "Coral Pink", hex: "#FDA4AF" },
];

export default function AnnotatorCanvas({
  width,
  height,
  pageNumber,
  fileId,
  initialAnnotations,
  onSaveAnnotation,
  onDeleteAnnotation,
  readOnly = false,
}: AnnotatorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tool settings
  const [tool, setTool] = useState<ToolType>("pen");
  const [color, setColor] = useState("#6B95F1");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [layerVisible, setLayerVisible] = useState(true);

  // Annotations on current page
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>(initialAnnotations);

  // Undo / Redo history stacks (at least 20 steps)
  const [history, setHistory] = useState<AnnotationRecord[][]>([initialAnnotations]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Pointer drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [rawPoints, setRawPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Update annotations when initialAnnotations change (e.g. on page navigation)
  useEffect(() => {
    setAnnotations(initialAnnotations);
    setHistory([initialAnnotations]);
    setHistoryIndex(0);
  }, [initialAnnotations, pageNumber]);

  // Redraw canvas whenever annotations, layerVisible, or live stroke changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!layerVisible) return;

    // 1. Draw saved annotations
    for (const anno of annotations) {
      if (!anno.layer_visible) continue;

      ctx.save();
      const path = new Path2D(anno.svg_path);

      if (anno.stroke_type === "highlight") {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = anno.color;
        ctx.lineWidth = anno.stroke_width;
        ctx.lineCap = "square";
        ctx.lineJoin = "miter";
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = anno.color;
        ctx.lineWidth = anno.stroke_width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }

      ctx.stroke(path);

      // Conflict indicator: visual amber border/glow
      if (anno.sync_status === "conflict") {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "#F59E0B"; // Amber
        ctx.lineWidth = Math.max(1.5, anno.stroke_width * 0.4);
        ctx.setLineDash([4, 4]);
        ctx.stroke(path);
        ctx.restore();
      }

      ctx.restore();
    }

    // 2. Draw live preview stroke
    if (isDrawing) {
      ctx.save();
      if (tool === "highlight") {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth * 3.5;
        ctx.lineCap = "square";
        ctx.lineJoin = "miter";
      } else if (tool === "eraser") {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }

      if ((tool === "pen" || tool === "highlight") && rawPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
        for (let i = 1; i < rawPoints.length; i++) {
          ctx.lineTo(rawPoints[i].x, rawPoints[i].y);
        }
        ctx.stroke();
      } else if (tool === "circle" && startPoint && currentPoint) {
        const svgPath = circleToSvgPath(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y);
        if (svgPath) {
          const path = new Path2D(svgPath);
          ctx.stroke(path);
        }
      } else if (tool === "arrow" && startPoint && currentPoint) {
        const svgPath = arrowToSvgPath(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, strokeWidth);
        if (svgPath) {
          const path = new Path2D(svgPath);
          ctx.stroke(path);
        }
      }

      ctx.restore();
    }
  }, [width, height, annotations, layerVisible, isDrawing, tool, color, strokeWidth, rawPoints, startPoint, currentPoint]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Push new state to history stack (max 30 steps)
  const pushHistory = (newAnnotations: AnnotationRecord[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newAnnotations);
    if (updatedHistory.length > 30) {
      updatedHistory.shift();
    }
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setAnnotations(newAnnotations);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setAnnotations(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setAnnotations(next);
    }
  };

  // Pointer event handlers
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (canvas) canvas.setPointerCapture(e.pointerId);

    const pt = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(pt);
    setCurrentPoint(pt);
    setRawPoints([pt]);

    if (tool === "eraser") {
      eraseAtPoint(pt);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const pt = getCanvasCoords(e);
    setCurrentPoint(pt);

    if (tool === "eraser") {
      eraseAtPoint(pt);
    } else {
      setRawPoints((prev) => [...prev, pt]);
    }
  };

  const eraseAtPoint = (pt: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check hit test for strokes
    const remaining = annotations.filter((anno) => {
      const path = new Path2D(anno.svg_path);
      ctx.lineWidth = Math.max(16, anno.stroke_width * 2.5);
      const isHit = ctx.isPointInStroke(path, pt.x, pt.y);
      if (isHit) {
        onDeleteAnnotation(anno.id);
        return false;
      }
      return true;
    });

    if (remaining.length !== annotations.length) {
      pushHistory(remaining);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);

    let generatedSvgPath = "";
    let finalWidth = strokeWidth;

    if (tool === "pen") {
      generatedSvgPath = pointsToSvgPath(rawPoints, 1.5);
      finalWidth = strokeWidth;
    } else if (tool === "highlight") {
      generatedSvgPath = pointsToSvgPath(rawPoints, 2.0);
      finalWidth = strokeWidth * 3.5;
    } else if (tool === "circle" && startPoint && currentPoint) {
      generatedSvgPath = circleToSvgPath(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y);
      finalWidth = strokeWidth;
    } else if (tool === "arrow" && startPoint && currentPoint) {
      generatedSvgPath = arrowToSvgPath(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, strokeWidth);
      finalWidth = strokeWidth;
    }

    if (generatedSvgPath && generatedSvgPath.trim().length > 0) {
      const newAnno: AnnotationRecord = {
        id: `anno_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspace_id: "",
        file_id: fileId,
        page_number: pageNumber,
        stroke_type: tool === "pen" ? "freehand" : (tool as "highlight" | "circle" | "arrow"),
        svg_path: generatedSvgPath,
        color,
        stroke_width: finalWidth,
        layer_visible: true,
        sync_status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = [...annotations, newAnno];
      pushHistory(updated);
      onSaveAnnotation(newAnno);
    }

    setRawPoints([]);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const handleClearPage = () => {
    if (annotations.length === 0) return;
    for (const anno of annotations) {
      onDeleteAnnotation(anno.id);
    }
    pushHistory([]);
  };

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* Top Floating Toolbar */}
      {!readOnly && (
        <div className="w-full max-w-4xl mb-4 bg-white/95 dark:bg-surface-card-dark/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-surface-border-light dark:border-surface-border-dark shadow-md flex flex-wrap items-center justify-between gap-3 z-20">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === "pen"
                  ? "bg-white dark:bg-zinc-700 text-accent-navy dark:text-accent-light shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
              title="Pena (Freehand)"
            >
              <Pen className="w-4 h-4" />
              <span className="hidden sm:inline">Pena</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTool("highlight");
                setColor("#FACC15");
              }}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === "highlight"
                  ? "bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
              title="Stabilo (Highlighter Transparan)"
            >
              <Highlighter className="w-4 h-4" />
              <span className="hidden sm:inline">Stabilo</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("circle")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === "circle"
                  ? "bg-white dark:bg-zinc-700 text-accent-navy dark:text-accent-light shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
              title="Lingkaran / Oval"
            >
              <CircleIcon className="w-4 h-4" />
              <span className="hidden md:inline">Lingkaran</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("arrow")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === "arrow"
                  ? "bg-white dark:bg-zinc-700 text-accent-navy dark:text-accent-light shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
              title="Panah"
            >
              <MoveRight className="w-4 h-4" />
              <span className="hidden md:inline">Panah</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tool === "eraser"
                  ? "bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
              title="Penghapus Goresan"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          </div>

          {/* Color Palette (Minimal 6 Colors for Pen, Vibrant for Highlighter) */}
          <div className="flex items-center gap-1.5">
            {(tool === "highlight" ? HIGHLIGHT_COLORS : PEN_COLORS).map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === c.hex
                    ? "scale-125 border-zinc-900 dark:border-white shadow-xs"
                    : "border-transparent hover:scale-110"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          {/* Stroke Width Slider */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500">
            <span className="text-[11px] font-medium">Ukuran:</span>
            <input
              type="range"
              min="1"
              max="12"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
              className="w-16 sm:w-20 accent-accent cursor-pointer"
            />
            <span className="w-4 text-center font-mono">{strokeWidth}px</span>
          </div>

          {/* Undo, Redo, Visibility Toggle & Clear */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

            {/* Layer Visibility Toggle (Hide/Show all annotations without deleting) */}
            <button
              type="button"
              onClick={() => setLayerVisible(!layerVisible)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                layerVisible
                  ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
              }`}
              title={layerVisible ? "Sembunyikan Layer Anotasi" : "Tampilkan Layer Anotasi"}
            >
              {layerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleClearPage}
              disabled={annotations.length === 0}
              className="p-2 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 transition-colors"
              title="Hapus Semua Anotasi di Halaman Ini"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Layer Hidden Warning Banner */}
      {!layerVisible && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Layer anotasi sedang disembunyikan. Klik ikon mata di toolbar untuk menampilkannya kembali.</span>
        </div>
      )}

      {/* Transparent Canvas Overlay */}
      <div className="relative inline-block overflow-hidden rounded-2xl shadow-lg border border-surface-border-light dark:border-surface-border-dark bg-transparent">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`touch-none ${
            readOnly
              ? "cursor-default"
              : tool === "eraser"
              ? "cursor-crosshair"
              : "cursor-crosshair"
          }`}
          style={{ width, height, display: "block" }}
        />
      </div>
    </div>
  );
}
