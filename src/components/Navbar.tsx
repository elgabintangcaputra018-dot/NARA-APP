"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Calendar,
  BookOpen,
  Laptop,
  Globe,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

export const Navbar = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
    { href: "/dashboard/schedule", label: "Jadwal Belajar", icon: Calendar },
    { href: "/dashboard/subjects", label: "Mata Pelajaran", icon: BookOpen },
    { href: "/dashboard/settings/devices", label: "Perangkat", icon: Laptop },
    { href: "/dashboard/settings/calendar", label: "Google Calendar", icon: Globe },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-surface-border-light dark:border-surface-border-dark bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-extrabold text-sm tracking-widest shadow-sm">
              N
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                NARA
              </span>
              <span className="ml-2 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-navy/5 dark:bg-accent-navy/80 text-accent-navy dark:text-accent-light border border-accent/30 inline-flex items-center gap-1 shadow-xs">
                <Sparkles className="w-2.5 h-2.5 text-highlight shrink-0" />
                <span>OSN</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-accent-navy text-white dark:bg-accent-subtle-dark dark:text-accent-light dark:border dark:border-accent/30 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <form action="/api/auth/logout" method="POST" className="hidden sm:inline-block">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </form>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-border-light dark:border-surface-border-dark bg-white dark:bg-surface-card-dark p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-accent-navy text-white dark:bg-accent-subtle-dark dark:text-accent-light dark:border dark:border-accent/30"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
