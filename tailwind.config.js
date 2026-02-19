/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#1D4ED8',
        danger: '#DC2626',
        success: '#16A34A',
        neutral: {
          50: '#F9FAFB',
          200: '#E5E7EB',
          400: '#9CA3AF',
          700: '#374151',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
};
