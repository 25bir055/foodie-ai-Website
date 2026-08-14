/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        moss: {
          DEFAULT: '#173C2C',
          50: '#EAF3EE',
          100: '#D2E6DA',
          200: '#A6CDB7',
          300: '#79B393',
          400: '#4D9A70',
          500: '#2C7C51',
          600: '#1D5E3C',
          700: '#173C2C',
          800: '#102A1E',
          900: '#0A1C14'
        },
        leaf: {
          DEFAULT: '#4CAE7A',
          light: '#7FCB9F',
          dark: '#39905F'
        },
        mint: {
          tint: '#EAF6EE',
          card: '#F3FAF5'
        },
        cream: '#FBFBF7',
        ink: '#122117',
        amber: '#E3A23D',
        clay: '#D9534F',
        sodium: '#3E7CB1'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Manrope"', 'sans-serif'],
        data: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(23, 60, 44, 0.18)',
        card: '0 4px 20px -6px rgba(23, 60, 44, 0.12)',
        glow: '0 0 0 1px rgba(76, 174, 122, 0.15), 0 8px 30px -8px rgba(76, 174, 122, 0.35)'
      },
      backgroundImage: {
        barcode: 'repeating-linear-gradient(90deg, currentColor 0px, currentColor 2px, transparent 2px, transparent 5px)'
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem'
      }
    }
  },
  plugins: []
}
