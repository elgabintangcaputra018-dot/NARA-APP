"use client";

import { useEffect } from "react";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-light dark:bg-surface-dark text-black dark:text-white transition-colors">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        <div className="relative">
          <NaraMascot pose="error" size="lg" />
          <div className="mt-3">
            <NaraBubble position="top" variant="warning">
              Tidak apa-apa, ayo coba lagi!
            </NaraBubble>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Terjadi Sedikit Kendala
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {error.message || "Sistem mengalami kesalahan sementara saat memproses permintaanmu."}
          </p>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white font-medium text-sm transition-colors shadow-sm"
          >
            Coba Ulang
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/dashboard")}
            className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </main>
  );
}
