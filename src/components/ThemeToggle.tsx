"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Laptop } from "lucide-react";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 ${className}`} />
    );
  }

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("system");
    }
  };

  const getLabel = () => {
    if (theme === "system") return "Mode Sistem";
    if (theme === "dark") return "Mode Gelap";
    return "Mode Terang";
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={getLabel()}
      aria-label={getLabel()}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800 ${className}`}
    >
      {theme === "system" ? (
        <Laptop className="w-4 h-4 text-accent" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="w-4 h-4 text-blue-400" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500" />
      )}
    </button>
  );
};

export default ThemeToggle;
