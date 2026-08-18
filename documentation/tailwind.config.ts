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
        bgBase: "#0a0a0c",
        bgSurface: "#121215",
        bgSurfaceHover: "#1c1c21",
        bgInput: "#050507",
        borderColor: "#27272a",
        brandPrimary: "#f97316",
        brandPrimaryHover: "#ea580c",
        brandSuccess: "#22c55e",
        brandWarning: "#eab308",
        brandDanger: "#ef4444",
        brandBulk: "#a855f7",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        display: ["var(--font-space)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
