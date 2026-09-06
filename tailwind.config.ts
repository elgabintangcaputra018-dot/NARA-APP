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
        // 3. Aksen Utama (Kombinasi #6B95F1 & Navy)
        accent: {
          DEFAULT: "#6B95F1", // Biru cerdas lembut
          light: "#8BACF5",
          dark: "#537FDC",
          navy: "#162342",    // Navy elegan & kokoh
          "navy-light": "#223561",
          "navy-dark": "#0D162B",
          subtle: "#F0F5FF",
          "subtle-dark": "#151E33",
        },
        // 4. Warna Variasi Tambahan (Soft Warm Gold/Amber — dipakai sedikit untuk aksen sparkle / badge OSN)
        highlight: {
          DEFAULT: "#E5A93C", // Emas lembut / amber hangat
          light: "#F3C56F",
          dark: "#C68B25",
          subtle: "#FEF7ED",
          "subtle-dark": "#291E10",
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
