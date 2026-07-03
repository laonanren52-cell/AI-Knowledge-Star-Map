/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        void: "#05070d",
        ink: "#0a1020",
        glass: "rgba(13, 21, 38, 0.68)",
      },
      boxShadow: {
        glow: "0 0 34px rgba(72, 126, 255, 0.24)",
        soft: "0 24px 80px rgba(0, 0, 0, 0.38)",
      },
    },
  },
  plugins: [],
};
