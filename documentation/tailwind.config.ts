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
        bgBase: "#09090b",
        bgSurface: "#141214",
        bgSurfaceHover: "#1d191a",
        bgInput: "#060607",
        borderColor: "#282322",
        borderHighlight: "#423835",
        brandAccent: "#c85a32",
        brandAccentHover: "#df744a",
        brandAccentMuted: "rgba(200, 90, 50, 0.14)",
        brandActiveCursor: "#e8845e",
        textMain: "#f2ede4",
        textMuted: "#8f837c",
        stateSuccess: "#4ea674",
        stateDanger: "#d94d43",
        stateWarning: "#d48b38",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
