import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF385C", // Airbnb-inspired red
        "primary-hover": "#E31C5F",
        secondary: "#00A699", // Teal accent
        "secondary-hover": "#008A80",
        background: "#FFFFFF",
        "background-gray": "#F7F7F7",
        surface: "#FFFFFF",
        "surface-hover": "#F9F9F9",
        border: "#E5E5E5",
        "border-light": "#F0F0F0",
        "text-primary": "#222222",
        "text-secondary": "#717171",
        "text-light": "#B0B0B0",
        success: "#00A699",
        error: "#C13515",
        warning: "#FFB400",
      },
      fontFamily: {
        sans: ["Circular", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 2px 16px rgba(0, 0, 0, 0.12)',
        'card-hover': '0 6px 20px rgba(0, 0, 0, 0.15)',
        'search': '0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      }
    },
  },
  plugins: [],
};
export default config;
