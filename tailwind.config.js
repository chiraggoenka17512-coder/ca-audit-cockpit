/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#060608',
          900: '#0a0a0c',
          850: '#0e0e12',
          800: '#141418',
          700: '#1e1e24',
          600: '#2a2a32',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          900: '#064e3b',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          900: '#78350f',
        },
        crimson: {
          400: '#f87171',
          500: '#ef4444',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
