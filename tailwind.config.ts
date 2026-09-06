import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 1. Brand Tokens (Logo / Maskot - tidak berubah)
        brand: {
          black: "#000000",
          white: "#FFFFFF",
        },
        // 2. Mode Tampilan (Surfaces)
        surface: {
          light: "#FFFFFF",
          dark: "#121212",
          "card-light": "#F9FAFB",
          "card-dark": "#1E1E1E",
          "border-light": "#E5E7EB",
          "border-dark": "#27272A",
        },
        // 3. Aksen Utama
        accent: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          dark: "#1D4ED8",
          subtle: "#EFF6FF",
          "subtle-dark": "#1E293B",
        },
        // 4. Token Prioritas (untuk fase berikutnya)
        priority: {
          "very-high": "#EF4444",
          high: "#F97316",
          medium: "#EAB308",
          low: "#84CC16",
          "very-low": "#9CA3AF",
        },
        // 5. Token Status (untuk fase berikutnya)
        status: {
          completed: "#22C55E",
          "in-progress": "#2563EB",
          "not-started": "#9CA3AF",
          cancelled: "#EF4444",
          overdue: "#DC2626",
        },
      },
    },
  },
  plugins: [],
};
export default config;
