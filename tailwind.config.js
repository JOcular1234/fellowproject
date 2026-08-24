/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4fb',
          100: '#d9e6f6',
          200: '#bcd3ee',
          300: '#8eb6e0',
          400: '#5990cc',
          500: '#3a72b5',
          600: '#2c5a99',
          700: '#26497f',
          800: '#243f6a',
          900: '#1e3554',
          950: '#17263f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
