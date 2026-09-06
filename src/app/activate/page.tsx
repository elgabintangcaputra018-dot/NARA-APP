"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import ThemeToggle from "@/components/ThemeToggle";
import { getDeviceInfo, DeviceInfo } from "@/lib/device-fingerprint";
import { KeyRound, Smartphone, AlertCircle, CheckCircle2, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function ActivatePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    // Generate device fingerprint once mounted on client
    const info = getDeviceInfo();
    setDeviceInfo(info);
  }, []);

  // Format code input as NARA-XXXX-XXXX-XXXX
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setError(null);

    // If starts with NARA, format with dashes
    if (raw.startsWith("NARA")) {
      raw = raw.substring(4);
    }

    const parts = ["NARA"];
    if (raw.length > 0) parts.push(raw.substring(0, 4));
    if (raw.length > 4) parts.push(raw.substring(4, 8));
    if (raw.length > 8) parts.push(raw.substring(8, 12));

    const formatted = parts.join("-");
    setCode(formatted);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().toUpperCase();
    setCode(pasted);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Silakan masukkan kode aktivasi Anda.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const currentDevice = deviceInfo || getDeviceInfo();
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          deviceId: currentDevice.deviceId,
          deviceName: currentDevice.deviceName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengaktivasi kode lisensi.");
      }

      setSuccess(data.message || "Aktivasi berhasil! Menyiapkan ruang belajar...");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi beberapa saat lagi.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 md:p-8 bg-surface-light dark:bg-surface-dark transition-colors">
      {/* Top Bar with Brand & Theme Toggle */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm tracking-wider">
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight text-black dark:text-white">
            NARA
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20">
            OSN Companion
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Activation Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white dark:bg-surface-card-dark rounded-3xl p-7 md:p-9 shadow-lg border border-surface-border-light dark:border-surface-border-dark flex flex-col items-center text-center relative overflow-hidden">
          {/* Decorative accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-blue-500 to-accent-light" />

          {/* Nara Mascot & Greeting */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              <NaraMascot pose={error ? "thinking" : success ? "success" : "idle"} size="lg" />
              <div className="mt-3">
                <NaraBubble position="top" variant={error ? "warning" : success ? "success" : "default"}>
                  {error
                    ? "Hmm, coba periksa kodenya lagi ya!"
                    : success
                    ? "Hebat! Ruang belajarmu sudah siap."
                    : "Halo! Masukkan kode aktivasi untuk mulai belajar."}
                </NaraBubble>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1 mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Aktivasi Akun Nara
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Satu lisensi dapat digunakan hingga 3 perangkatmu
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="text-left space-y-1.5">
              <label
                htmlFor="activation-code"
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-accent" />
                Kode Lisensi
              </label>
              <div className="relative">
                <input
                  id="activation-code"
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  onPaste={handlePaste}
                  placeholder="NARA-XXXX-XXXX-XXXX"
                  maxLength={19}
                  spellCheck={false}
                  autoComplete="off"
                  disabled={loading || Boolean(success)}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-center font-mono font-bold tracking-widest text-lg md:text-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent focus:bg-white dark:focus:bg-zinc-900 transition-all uppercase placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs md:text-sm text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs md:text-sm text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span className="leading-snug">{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full py-3.5 px-5 rounded-2xl bg-accent hover:bg-accent-dark text-white font-semibold text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Kode...</span>
                </>
              ) : success ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Masuk ke Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Mulai Belajar Sekarang</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Device Fingerprint Card */}
          {deviceInfo && (
            <div className="w-full mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 text-xs">
                <Smartphone className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <div>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    {deviceInfo.deviceName}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate max-w-[200px]">
                    ID: {deviceInfo.deviceId.substring(0, 16)}...
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                Perangkat Terverifikasi
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center py-3 text-xs text-zinc-400 dark:text-zinc-600">
        <p>Langkah kecil hari ini, perubahan besar nanti.</p>
        <p className="mt-0.5 text-[11px]">NARA • Learn • Focus • Grow • Together</p>
      </footer>
    </div>
  );
}
