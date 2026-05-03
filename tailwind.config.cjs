/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/index.html', './frontend/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f6f8fc',
        ink: '#101828',
        brand: '#2563eb',
        brandSoft: '#eef4ff',
        line: '#e8edf5',
        muted: '#667085'
      },
      boxShadow: {
        panel: '0 14px 34px rgba(16, 24, 40, 0.07), 0 2px 8px rgba(16, 24, 40, 0.04)',
        soft: '0 10px 26px rgba(37, 99, 235, 0.10)'
      }
    }
  },
  plugins: []
}
