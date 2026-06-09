import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palava-ish muted archive palette.
        ink: "#2b2622",
        cloth: "#f6f1e7",
        clay: "#b6694a",
        sage: "#7f8a6a",
        sand: "#e7ddc9",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "ui-serif", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
