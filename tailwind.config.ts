import type { Config } from "tailwindcss";

// Every color resolves through a CSS variable holding "r g b" channels, so the
// whole app re-skins by swapping variables under html[data-theme] — existing
// slate-*/prog/loot/boss classes keep working and become theme-aware.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: v("slate-50"),
          100: v("slate-100"),
          200: v("slate-200"),
          300: v("slate-300"),
          400: v("slate-400"),
          500: v("slate-500"),
          600: v("slate-600"),
          700: v("slate-700"),
          800: v("slate-800"),
          900: v("slate-900"),
          950: v("slate-950"),
        },
        loot: { DEFAULT: v("loot"), dim: v("loot-dim") },
        prog: { DEFAULT: v("prog"), dim: v("prog-dim") },
        boss: { DEFAULT: v("boss"), dim: v("boss-dim") },
        rarity: {
          junk: v("rarity-junk"),
          uncommon: v("rarity-uncommon"),
          rare: v("rarity-rare"),
          epic: v("rarity-epic"),
          legendary: v("rarity-legendary"),
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "chest-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "rise": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "chest-pop": "chest-pop 0.45s cubic-bezier(.2,.8,.2,1) both",
        "rise": "rise 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
