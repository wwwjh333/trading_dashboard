/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // 'class' strategy: add/remove .dark on <html> to toggle
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surface backgrounds — all driven by CSS vars (RGB component format)
        surface: {
          900: 'rgb(var(--surface-900) / <alpha-value>)',
          800: 'rgb(var(--surface-800) / <alpha-value>)',
          700: 'rgb(var(--surface-700) / <alpha-value>)',
          600: 'rgb(var(--surface-600) / <alpha-value>)',
          500: 'rgb(var(--surface-500) / <alpha-value>)',
        },
        // Gray text scale — inverted between dark/light
        gray: {
          50:  'rgb(var(--gray-50) / <alpha-value>)',
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
        },
        // Accent colors — support opacity modifiers (e.g. bg-accent-green/10)
        accent: {
          blue:   'rgb(var(--accent-blue) / <alpha-value>)',
          green:  'rgb(var(--accent-green) / <alpha-value>)',
          red:    'rgb(var(--accent-red) / <alpha-value>)',
          yellow: 'rgb(var(--accent-yellow) / <alpha-value>)',
          purple: 'rgb(var(--accent-purple) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px rgb(0 0 0 / 0.12), 0 1px 2px rgb(0 0 0 / 0.08)',
        'card-md': '0 4px 12px rgb(0 0 0 / 0.15), 0 1px 3px rgb(0 0 0 / 0.10)',
        'card-lg': '0 8px 24px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.12)',
      },
      transitionProperty: {
        colors: 'color, background-color, border-color, fill, stroke',
      },
    },
  },
  plugins: [],
}
