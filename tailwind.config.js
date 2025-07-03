// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  // darkMode: 'class', // Remove or comment this line out
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // You might define your custom colors here to centralize them, e.g.:
      colors: {
        'dark-bg-primary': '#1A1B1E',
        'dark-bg-secondary': '#202225',
        'dark-bg-tertiary': '#34373B',
        'dark-border': '#474A50',
        // ... and so on for text colors, etc.
      },
    },
  },
  plugins: [],
}