// Kin design tokens — dark, calm, Apple Health–style: near-black canvas, raised charcoal cards,
// one warm coral accent for actions, and a colour per health category. No gradients, no purple.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', '"Segoe UI"', "system-ui", "sans-serif"],
        display: ['"Instrument Serif"', "Georgia", "serif"],
      },
      colors: {
        canvas: "#0A0A0B",          // page
        card: "#161618",            // raised surface
        raised: "#222225",          // controls, selected tiles
        ink: { DEFAULT: "#F5F5F7", 2: "#A1A1A6", 3: "#6E6E73" },
        hairline: "#2C2C2E",
        accent: { DEFAULT: "#FF7A4D", dark: "#F0663A", soft: "#3A1F15", ink: "#1C0D06" }, // warm coral; text on it is dark
        good: { DEFAULT: "#32D74B", soft: "#10301A" },
        notice: { DEFAULT: "#FFB340", soft: "#3A2A0E" },
        alert: { DEFAULT: "#FF5A52", soft: "#3D1715" },
        // categories (also in lib/metrics.ts + lib/vitals.ts for charts)
        heart: "#FF5A52",
        pressure: "#FF7AB2",
        steps: "#FF9F0A",
        sleep: "#64D2FF",
        mobility: "#FFD60A",
        speech: "#0A84FF",
        pauses: "#63E6BE",
      },
      borderRadius: { card: "24px", control: "16px" },
    },
  },
  plugins: [],
};
