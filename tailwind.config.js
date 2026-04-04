/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f8f4',
          100: '#e6f0e7',
          200: '#cde1cf',
          300: '#a8c9ab',
          400: '#7a9e7e',
          500: '#5c8260',
          600: '#476750',
          700: '#395340',
        },
        charcoal:  '#2C2C2C',
        // Warmer, more characterful base — replaces flat cream
        cream:     '#F2F0ED',
        parchment: '#ECEAE5',
        stone:     '#DDD9D2',
      },
      fontFamily: {
        // Outfit: modern geometric sans — used for all headings
        display:  ['Outfit', 'system-ui', 'sans-serif'],
        sans:     ['Inter',  'system-ui', 'sans-serif'],
        // Playfair kept for rare accent use only
        serif:    ['"Playfair Display"', 'Georgia', 'serif'],
        // Avenir Next — system font on Apple devices, falls back to system-ui elsewhere
        nunito:   ['"Avenir Next"', 'Avenir', 'system-ui', 'sans-serif'],
        // Fredoka — friendly rounded bold for dopaminehero brand
        fredoka:  ['Fredoka', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.2em',
      },
    },
  },
  plugins: [],
}
