import NaraMascot from "@/components/NaraMascot";
import NaraBubble from "@/components/NaraBubble";

export default function Loading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-light dark:bg-surface-dark text-black dark:text-white transition-colors">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="relative">
          <NaraMascot pose="sleep" size="lg" />
          <div className="absolute -top-3 -right-16">
            <NaraBubble position="bottom" variant="info">
              Sedang menyiapkan... zzz
            </NaraBubble>
          </div>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Mempersiapkan materi belajarmu bersama Nara...
        </p>
      </div>
    </main>
  );
}
