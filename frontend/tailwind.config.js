/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        sun: "#f59e0b",
        mint: "#10b981",
        rose: "#f43f5e",
        slate: "#94a3b8"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular"]
      },
      backgroundImage: {
        glow: "radial-gradient(1200px 500px at 20% -10%, rgba(245,158,11,0.25), transparent 60%), radial-gradient(900px 400px at 80% 10%, rgba(16,185,129,0.18), transparent 55%)"
      }
    }
  },
  plugins: []
};
