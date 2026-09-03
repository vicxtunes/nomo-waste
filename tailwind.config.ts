import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Spark Admin palette (see src/app/globals.css design tokens).
        forest: {
          dark: "#051c12",
          medium: "#072f1f",
          light: "#1a3e30",
        },
        lime: {
          accent: "#b4f105",
          hover: "#c1f824",
        },
        canvas: "#f4f6f5",
        "muted-green": "#6c7e75",
        // Legacy tokens still referenced by the map components.
        navy: {
          700: "#1e2a54",
          800: "#161f42",
          900: "#0e1530",
        },
        amber: {
          accent: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
