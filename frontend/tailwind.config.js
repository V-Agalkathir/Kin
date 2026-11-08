// Kin design tokens — calm, Apple Health–style: grouped grey background, white cards,
// one warm accent for actions, and a colour per health category. No gradients.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', "Inter", '"Segoe UI"', "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#F2F2F7",          // grouped background
        card: "#FFFFFF",
        ink: { DEFAULT: "#1C1C1E", 2: "#6C6C70", 3: "#AEAEB2" },
        hairline: "#E5E5EA",
        fill: "#EDEDF0",           // quiet controls, segmented track
        accent: { DEFAULT: "#D9663F", dark: "#BF5532", soft: "#FBEAE3" }, // warm clay, primary actions
        good: { DEFAULT: "#30A46C", soft: "#E3F5EB" },
        notice: { DEFAULT: "#E8890C", soft: "#FDF0DC" },
        alert: { DEFAULT: "#E5484D", soft: "#FCE8E8" },
        // categories
        mobility: "#F2711C",
        speech: "#0A84FF",
        pauses: "#14A3A3",
        watch: "#E5484D",
      },
      borderRadius: { card: "22px", control: "16px" },
      boxShadow: { card: "0 1px 2px rgba(0,0,0,0.04)" },
    },
  },
  plugins: [],
};
