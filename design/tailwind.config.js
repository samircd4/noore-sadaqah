// Noore Sadaqah Foundation — the same palette for Tailwind v3
// or the Tailwind Play CDN (<script src="https://cdn.tailwindcss.com">).
// With Tailwind v4 use design/tokens.css instead; keep both files in sync.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,mdx}", "./*.html"],
  theme: {
    extend: {
      colors: {
        em: {
          50: "#EAF6F0",
          100: "#CDE9DC",
          500: "#1F8A63",
          600: "#16704F",
          700: "#0F5A3F",
          800: "#0B4631",
          900: "#072E20",
          950: "#041C13",
        },
        sand: {
          50: "#FBF8F2",
          100: "#F5EEDF",
          200: "#EADFC8",
          300: "#DCCBA6",
        },
        gold: { 400: "#F4D27A", 500: "#D6A83F", 600: "#B88725" },
      },
      fontFamily: {
        sans: ['"Noto Sans Bengali"', "system-ui", "sans-serif"],
        head: ['"Noto Serif Bengali"', "serif"],
      },
      boxShadow: {
        card: "0 18px 45px rgba(4, 28, 19, 0.12)",
        "card-hover": "0 26px 55px rgba(4, 28, 19, 0.22)",
      },
    },
  },
};
