"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Laptop,
  Smartphone,
  Trash2,
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface DeviceItem {
  id: string;
  workspace_id: string;
  device_id: string;
  device_name: string;
  last_active_at: string;
  created_at: string;
}

interface DeviceDataResponse {
  success: boolean;
  currentDeviceId: string;
  devices: DeviceItem[];
  quota: {
    used: number;
    max: number;
    available: number;
  };
  license: {
    plan: string;
    planLabel: string;
    activatedAt: string;
    expiresAt: string;
    daysRemaining: number;
    isApproachingExpiration: boolean;
    status: string;
  };
}

export default function ManageDevicesPage() {
  const [data, setData] = useState<DeviceDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/devices");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal memuat perangkat.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus perangkat "${deviceName}"? Slot ini akan kosong dan dapat digunakan untuk perangkat baru.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(deviceId);
      setActionMessage(null);
      setError(null);

      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menghapus perangkat.");
      }

      setActionMessage(json.message || "Perangkat berhasil dihapus.");
      await fetchDevices();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghapus perangkat.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 2) return "Baru saja aktif";
      if (diffMin < 60) return `${diffMin} menit yang lalu`;
      if (diffHour < 24) return `${diffHour} jam yang lalu`;
      if (diffDay < 7) return `${diffDay} hari yang lalu`;
      return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "Waktu tidak diketahui";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      {/* Top Header */}
      <header className="border-b border-surface-border-light dark:border-surface-border-dark bg-white/70 dark:bg-surface-dark/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Title and Mascot Card */}
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Kelola Perangkat & Lisensi
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              Satu lisensi Nara dapat diakses hingga 3 perangkat secara bersamaan. Hapus perangkat yang sudah tidak dipakai untuk mendaftarkan perangkat baru.
            </p>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="relative">
              <NaraMascot
                pose={data?.license?.isApproachingExpiration ? "thinking" : "idle"}
                size="md"
              />
              <div className="mt-2">
                <NaraBubble
                  position="top"
                  variant={data?.license?.isApproachingExpiration ? "warning" : "default"}
                >
                  {data?.license?.isApproachingExpiration
                    ? `Perhatian! Masa aktif tinggal ${data?.license?.daysRemaining} hari lagi.`
                    : "Semua perangkatmu aman terjaga bersama Nara."}
                </NaraBubble>
              </div>
            </div>
          </div>
        </div>

        {/* Quota & Expiration Details */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Quota Card */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-6 border border-surface-border-light dark:border-surface-border-dark shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Kuota Perangkat
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-navy/5 dark:bg-accent-navy/80 text-accent-navy dark:text-accent-light border border-accent/30">
                  Maksimal 3 Perangkat
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                    {data.quota.used} dari {data.quota.max} perangkat
                  </span>
                  <span className="text-xs font-medium text-zinc-500">
                    {data.quota.available > 0
                      ? `${data.quota.available} slot tersedia`
                      : "Slot penuh"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex gap-1 p-0.5 border border-zinc-200/60 dark:border-zinc-700/40">
                  {[1, 2, 3].map((slot) => {
                    const isOccupied = slot <= data.quota.used;
                    return (
                      <div
                        key={slot}
                        className={`flex-1 h-full rounded-full transition-all ${
                          isOccupied
                            ? data.quota.used === 3
                              ? "bg-highlight"
                              : "bg-accent"
                            : "bg-zinc-200 dark:bg-zinc-700/60"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {data.quota.used >= 3
                  ? "Untuk menambahkan perangkat baru, hapus salah satu perangkat di bawah ini."
                  : "Anda masih bisa mengaktifkan kode ini di perangkat lain."}
              </p>
            </div>

            {/* License Expiration Card */}
            <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-6 border border-surface-border-light dark:border-surface-border-dark shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Masa Berlaku Lisensi
                </span>
                {data.license.isApproachingExpiration ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Mendekati Kedaluwarsa
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Aktif
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {data.license.planLabel}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Kedaluwarsa pada:{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
                    {data.license.expiresAt
                      ? new Date(data.license.expiresAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </strong>{" "}
                  ({data.license.daysRemaining} hari lagi)
                </p>
              </div>

              {data.license.isApproachingExpiration && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                  Lisensimu akan segera habis dalam waktu kurang dari 30 hari. Hubungi pembina atau admin untuk perpanjangan masa aktif.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications */}
        {actionMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 text-sm flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Device List Section */}
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Daftar Perangkat Aktif
            </h2>
            <button
              type="button"
              onClick={fetchDevices}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {loading && !data ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <p className="text-xs text-zinc-400">Memeriksa perangkat terdaftar...</p>
            </div>
          ) : data?.devices && data.devices.length > 0 ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.devices.map((device) => {
                const isCurrent = device.device_id === data.currentDeviceId;
                const isDeleting = deletingId === device.id;

                return (
                  <div
                    key={device.id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-accent-navy/10 dark:bg-accent-navy/60 flex items-center justify-center text-accent dark:text-accent-light border border-accent/20 shrink-0">
                        {device.device_name.toLowerCase().includes("iphone") ||
                        device.device_name.toLowerCase().includes("android") ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Laptop className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                            {device.device_name}
                          </p>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-accent-navy to-accent-dark text-white text-[10px] font-bold tracking-wide border border-accent/30 shadow-xs flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-highlight" />
                              Perangkat Ini
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{formatRelativeTime(device.last_active_at)}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">
                            ID: {device.device_id.substring(0, 14)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {isCurrent ? (
                        <span className="text-xs text-zinc-400 italic px-3 py-1.5">
                          Sedang Digunakan
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(device.id, device.device_name)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Hapus Perangkat Ini</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-zinc-500">
              Belum ada perangkat yang terdaftar.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
