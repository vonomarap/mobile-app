const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "./App.tsx",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: "#e4e4e7",
          dark: "#27272a",
        },
        input: {
          DEFAULT: "#e4e4e7",
          dark: "#27272a",
        },
        ring: {
          DEFAULT: "#18181b",
          dark: "#fafafa",
        },
        background: {
          DEFAULT: "#fafafa",
          dark: "#09090b",
        },
        foreground: {
          DEFAULT: "#18181b",
          dark: "#fafafa",
        },
        primary: {
          DEFAULT: "#D9521E", // Brand accent color
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f4f4f5",
          dark: "#18181b",
          foreground: "#18181b",
          "foreground-dark": "#fafafa",
        },
        muted: {
          DEFAULT: "#f4f4f5",
          dark: "#18181b",
          foreground: "#71717a",
          "foreground-dark": "#a1a1aa",
        },
        accent: {
          DEFAULT: "#f4f4f5",
          dark: "#27272a",
          foreground: "#18181b",
          "foreground-dark": "#fafafa",
        },
        popover: {
          DEFAULT: "#ffffff",
          dark: "#111113",
          foreground: "#18181b",
          "foreground-dark": "#fafafa",
        },
        card: {
          DEFAULT: "#ffffff",
          dark: "#111113",
          foreground: "#18181b",
          "foreground-dark": "#fafafa",
        },
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
