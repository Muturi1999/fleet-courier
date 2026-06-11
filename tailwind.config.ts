import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1C3B",
          mid: "#132344",
          light: "#1E3260",
        },
        accent: {
          DEFAULT: "#E8A020",
          light: "#FFF4DC",
          dark: "#C07800",
        },
        teal: {
          DEFAULT: "#1D9E75",
          light: "#E1F5EE",
        },
        fleet: {
          red: "#D85A30",
          "red-light": "#FAECE7",
          blue: "#378ADD",
          "blue-light": "#E6F1FB",
          gray: {
            50: "#F7F8FA",
            100: "#EDEEF2",
            200: "#D8DAE2",
            400: "#8A8FA8",
            600: "#4A4F6A",
            800: "#1E2340",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      boxShadow: {
        fleet: "0 4px 16px rgba(11,28,59,0.10)",
        "fleet-sm": "0 1px 3px rgba(11,28,59,0.08)",
      },
      borderRadius: {
        fleet: "14px",
        "fleet-md": "10px",
        "fleet-sm": "6px",
      },
      keyframes: {
        slideIn: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        slideIn: "slideIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
