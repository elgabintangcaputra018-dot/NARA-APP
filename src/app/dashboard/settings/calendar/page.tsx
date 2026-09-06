"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  AlertCircle,
  Unlink,
  Loader2,
  Sparkles,
} from "lucide-react";

interface CalendarSettingsResponse {
  success: boolean;
  isConnected: boolean;
  syncMode: "two_way" | "read_only";
  lastUpdated?: string;
  isRealApiConfigured: boolean;
}

interface ScheduleConflictItem {
  sessionId: string;
  sessionTitle: string;
  conflictingEventTitle: string;
  eventStart: string;
  eventEnd: string;
}

export default function CalendarSettingsPage() {
  const [settings, setSettings] = useState<CalendarSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    message: string;
    conflicts: ScheduleConflictItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/calendar/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pengaturan");
      setSettings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan sistem";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleSyncMode = async (newMode: "two_way" | "read_only") => {
    try {
      setError(null);
      const res = await fetch("/api/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_mode: newMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui mode");
      await fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan sistem";
      setError(msg);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSyncResult(null);
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal sinkronisasi");
      setSyncResult(data.message || "Berhasil disinkronkan ke Google Calendar.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal sinkronisasi";
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleImportAndDetectConflicts = async () => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);
      const res = await fetch("/api/calendar/import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimpor");
      setImportResult({
        message: data.message,
        conflicts: data.conflicts || [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal impor";
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Putuskan koneksi akun Google Calendar dari ruang belajar ini?")) return;
    try {
      setError(null);
      const res = await fetch("/api/calendar/settings", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal memutuskan koneksi");
      await fetchSettings();
      setSyncResult(null);
      setImportResult(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Hero Card */}
        <section className="bg-gradient-to-br from-white via-surface-card-light to-accent-subtle/40 dark:from-surface-card-dark dark:via-zinc-900/60 dark:to-accent-navy/30 rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-navy/5 dark:bg-accent-navy/80 border border-accent/30 text-accent-navy dark:text-accent-light text-xs font-semibold shadow-xs">
              <Sparkles className="w-3 h-3 text-highlight" />
              <span>Sinkronisasi Google Calendar (Free Tier)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Integrasi Kalender & Agenda
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg">
              Hubungkan jadwal belajar Nara dengan Google Calendar pribadimu agar sesi latihan OSN otomatis muncul di ponsel dan kalender harianmu.
            </p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <NaraMascot pose="focus" size="md" />
              <div className="mt-2">
                <NaraBubble position="top" variant="default">
                  Nara menjaga jadwalmu agar tidak bertabrakan dengan agenda lain!
                </NaraBubble>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {syncResult && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{syncResult}</span>
          </div>
        )}

        {/* Main Settings Panel */}
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-accent border border-accent/20 shrink-0">
                <Globe className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    Status Google Calendar
                  </h2>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : settings?.isConnected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terhubung</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      Belum Terhubung
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {settings?.isConnected
                    ? "Jadwal belajar Nara siap disinkronkan dengan Google Calendar"
                    : "Klik tombol di bawah untuk mengizinkan sinkronisasi jadwal"}
                </p>
              </div>
            </div>

            <div>
              {settings?.isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Putuskan Koneksi</span>
                </button>
              ) : (
                <a
                  href="/api/calendar/auth"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-navy to-accent-dark hover:from-accent-navy-light hover:to-accent text-white text-xs font-semibold shadow-md shadow-accent-navy/20 border border-accent/30 inline-flex items-center gap-2 transition-all"
                >
                  <Globe className="w-4 h-4" />
                  <span>Hubungkan Google Calendar</span>
                </a>
              )}
            </div>
          </div>

          {/* Sync Mode Toggle: Two-Way vs Read-Only */}
          {settings?.isConnected && (
            <div className="space-y-6 pt-2">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Mode Sinkronisasi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Two-Way Sync Option */}
                  <div
                    onClick={() => handleToggleSyncMode("two_way")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      settings.syncMode === "two_way"
                        ? "border-accent bg-accent-subtle/40 dark:bg-accent-subtle-dark/40"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-accent" />
                        Sync Penuh (Dua Arah)
                      </span>
                      {settings.syncMode === "two_way" && (
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sesi belajar otomatis dibuatkan agenda di Google Calendar, dan agenda eksternal diperiksa untuk deteksi bentrok jadwal.
                    </p>
                  </div>

                  {/* Read-Only Option */}
                  <div
                    onClick={() => handleToggleSyncMode("read_only")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      settings.syncMode === "read_only"
                        ? "border-accent bg-accent-subtle/40 dark:bg-accent-subtle-dark/40"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        Hanya Baca (Read-Only)
                      </span>
                      {settings.syncMode === "read_only" && (
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Nara hanya membaca agenda Google Calendar untuk mengecek bentrok waktu tanpa menambah agenda baru ke Google Calendar-mu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Sync & Import */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={syncing || settings.syncMode === "read_only"}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Kirim Sesi Belajar ke Google Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportAndDetectConflicts}
                  disabled={importing}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {importing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>Cek Bentrok Jadwal (Conflict Detector)</span>
                </button>
              </div>

              {/* Conflict Detection Results Panel */}
              {importResult && (
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Hasil Analisis Bentrok Waktu
                  </h4>
                  <p className="text-xs text-zinc-500">{importResult.message}</p>

                  {importResult.conflicts.length > 0 ? (
                    <div className="space-y-2">
                      {importResult.conflicts.map((conf, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">
                              Bentrok: Sesi &ldquo;{conf.sessionTitle}&rdquo; bersamaan dengan agenda &ldquo;{conf.conflictingEventTitle}&rdquo;
                            </p>
                            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                              Waktu: {new Date(conf.eventStart).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} — {new Date(conf.eventEnd).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Bagus! Tidak ada jadwal yang bertabrakan dengan agenda Google Calendar-mu.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
