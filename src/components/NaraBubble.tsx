"use client";

import React from "react";

interface NaraBubbleProps {
  children: React.ReactNode;
  className?: string;
  position?: "top" | "right" | "bottom" | "left";
  variant?: "default" | "warning" | "success" | "info";
}

export const NaraBubble: React.FC<NaraBubbleProps> = ({
  children,
  className = "",
  position = "right",
  variant = "default",
}) => {
  let variantStyles = "bg-white dark:bg-surface-card-dark text-black dark:text-white border-surface-border-light dark:border-surface-border-dark";

  if (variant === "warning") {
    variantStyles = "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800";
  } else if (variant === "success") {
    variantStyles = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800";
  } else if (variant === "info") {
    variantStyles = "bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-800";
  }

  return (
    <div
      className={`relative inline-block px-4 py-2.5 rounded-2xl border shadow-sm text-sm font-medium leading-relaxed max-w-xs transition-all ${variantStyles} ${className}`}
    >
      {children}
      {/* Speech pointer tail */}
      {position === "right" && (
        <span
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white dark:border-r-surface-card-dark"
          aria-hidden="true"
        />
      )}
      {position === "left" && (
        <span
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white dark:border-l-surface-card-dark"
          aria-hidden="true"
        />
      )}
      {position === "top" && (
        <span
          className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-surface-card-dark"
          aria-hidden="true"
        />
      )}
      {position === "bottom" && (
        <span
          className="absolute left-1/2 -top-2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white dark:border-b-surface-card-dark"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default NaraBubble;
