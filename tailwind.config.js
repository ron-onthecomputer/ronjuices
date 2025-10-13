/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f3e5f5",
          100: "#e1bee7",
          200: "#ce93d8",
          300: "#ba68c8",
          400: "#ab47bc",
          500: "#9c27b0",
          600: "#8e24aa",
          700: "#7b1fa2",
          800: "#6a1b9a",
          900: "#4a148c",
        },
        secondary: {
          50: "#f5f0e8",
          100: "#e6ddd1",
          200: "#d4c4a8",
          300: "#c2ab7f",
          400: "#b5985c",
          500: "#a88539",
          600: "#9a7233",
          700: "#8c5f2d",
          800: "#7e4c27",
          900: "#703921",
        },
        accent: {
          50: "#e3f2fd",
          100: "#bbdefb",
          200: "#90caf9",
          300: "#64b5f6",
          400: "#42a5f5",
          500: "#2196f3",
          600: "#1e88e5",
          700: "#1976d2",
          800: "#1565c0",
          900: "#0d47a1",
        },
        skin: {
          100: "#fdd5c7",
          200: "#f7a88a",
          300: "#f08b5c",
          400: "#e85d2e",
          500: "#d94606",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
        "clash-display": ["Clash Display-Variable", "sans"],
        askey: ["Askey", "Century gothic"],
        satoshi: ["Satoshi", "sans"],
        bagerich: ["Bagerich", "sans"],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in": "fadeIn 1s ease-in-out",
        "slide-up": "slideUp 0.8s ease-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("flowbite/plugin")],
};
