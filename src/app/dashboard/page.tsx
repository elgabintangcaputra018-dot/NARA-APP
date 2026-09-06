import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { getSession, getWorkspace, getWorkspaceLicense, getDeviceSessions } from "@/lib/db";
import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Laptop,
  Calendar,
  BookOpen,
  Sparkles,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("nara_session")?.value;

  if (!sessionToken) {
    redirect("/activate");
  }

  const session = await getSession(sessionToken);
  if (!session) {
    redirect("/activate");
  }

  const [workspace, license, devices] = await Promise.all([
    getWorkspace(session.workspace_id),
    getWorkspaceLicense(session.workspace_id),
    getDeviceSessions(session.workspace_id),
  ]);

  const now = Date.now();
  const expiresAtMs = license?.expires_at ? new Date(license.expires_at).getTime() : 0;
  const daysRemaining = expiresAtMs > now ? Math.ceil((expiresAtMs - now) / (1000 * 60 * 60 * 24)) : 0;
  const planName =
    license?.plan === "yearly_launching" ? "Paket Peluncuran 1 Tahun" : "Paket Normal 1 Tahun";

  return (
    <div className="min-h-screen flex flex-col bg-surface-light dark:bg-surface-dark transition-colors">
      {/* Navbar */}
      <header className="border-b border-surface-border-light dark:border-surface-border-dark bg-white/70 dark:bg-surface-dark/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-extrabold text-sm tracking-widest shadow-sm">
              N
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                NARA
              </span>
              <span className="ml-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-navy/5 dark:bg-accent-navy/80 text-accent-navy dark:text-accent-light border border-accent/30 inline-flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-highlight shrink-0" />
                <span>OSN Companion</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Welcome & Companion Hero Card */}
        <section className="bg-gradient-to-br from-white via-surface-card-light to-accent-subtle/40 dark:from-surface-card-dark dark:via-zinc-900/60 dark:to-accent-navy/30 rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm relative overflow-hidden">
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-navy via-accent to-accent-light" />
          <div className="absolute top-0 right-10 w-6 h-1 bg-highlight" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 pt-1">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-subtle dark:bg-accent-subtle-dark border border-accent/20 text-accent-dark dark:text-accent-light text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-highlight shrink-0" />
                <span>Lisensi Aktif • {daysRemaining} Hari Tersisa</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Selamat Datang, {workspace?.name || "Pejuang OSN"}!
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg leading-relaxed">
                Nara siap menemanimu belajar dengan konsisten dan fokus untuk menaklukkan setiap materi Olimpiade Sains Nasional.
              </p>
            </div>

            {/* Mascot in Action */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative">
                <NaraMascot pose="idle" size="lg" />
                <div className="mt-2">
                  <NaraBubble position="top" variant="default">
                    Halo! Siap belajar hari ini?
                  </NaraBubble>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status & Quick Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: License Status */}
          <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-surface-border-light dark:border-surface-border-dark shadow-sm flex flex-col justify-between hover:border-accent/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Status Langganan
              </span>
              <div className="w-8 h-8 rounded-lg bg-accent-navy/10 dark:bg-accent-navy/60 flex items-center justify-center text-accent border border-accent/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{planName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-accent" />
                Berlaku hingga: {license?.expires_at ? new Date(license.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
              </p>
            </div>
          </div>

          {/* Card 2: Devices Used */}
          <Link
            href="/dashboard/settings/devices"
            className="group bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-surface-border-light dark:border-surface-border-dark shadow-sm flex flex-col justify-between hover:border-accent/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Perangkat Terdaftar
              </span>
              <div className="w-8 h-8 rounded-lg bg-accent-navy/10 dark:bg-accent-navy/60 flex items-center justify-center text-accent border border-accent/20 group-hover:scale-105 transition-transform">
                <Laptop className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                  {devices.length} <span className="text-sm font-normal text-zinc-400">/ 3</span>
                </p>
                <span className="text-xs font-medium text-accent flex items-center gap-1 group-hover:underline">
                  Kelola <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {3 - devices.length > 0 ? `Tersedia ${3 - devices.length} slot perangkat baru` : "Batas 3 perangkat telah penuh"}
              </p>
            </div>
          </Link>

          {/* Card 3: Study Cycle Progress (Foreshadowing Phase 2+) */}
          <div className="bg-white dark:bg-surface-card-dark rounded-2xl p-5 border border-surface-border-light dark:border-surface-border-dark shadow-sm flex flex-col justify-between hover:border-highlight/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Siklus Belajar OSN
              </span>
              <div className="w-8 h-8 rounded-lg bg-highlight-subtle dark:bg-highlight-subtle-dark flex items-center justify-center text-highlight border border-highlight/30">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Fondasi Aktif</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Fase 0 & 1 Selesai. Modul Jadwal & Anotasi siap dibangun.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Roadmap Preview (Upcoming Phases) */}
        <section className="bg-white dark:bg-surface-card-dark rounded-3xl p-6 md:p-8 border border-surface-border-light dark:border-surface-border-dark shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Pusat Pembelajaran Nara
              </h2>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
                Alur belajar terintegrasi khusus untuk siswa peserta OSN
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-accent flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Jadwal Belajar & Google Sync</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Atur target per materi dan sinkronkan dengan Google Calendar.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Anotasi PDF & Tutup Label</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Coret materi offline & mode tebak diagram untuk active recall.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Deep-Work & Analitik</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Fokus timer ditemani Nara dan pantau progres penguasaan topik.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 border-t border-surface-border-light dark:border-surface-border-dark text-center text-xs text-zinc-400 dark:text-zinc-600">
        <p>Langkah kecil hari ini, perubahan besar nanti.</p>
        <p className="mt-1">NARA • Learn • Focus • Grow • Together</p>
      </footer>
    </div>
  );
}
