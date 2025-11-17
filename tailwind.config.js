/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Sora"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#1F8EF1',
          dark: '#1368B7',
          light: '#E3F2FD',
        },
      },
    },
  },
  plugins: [],
};
