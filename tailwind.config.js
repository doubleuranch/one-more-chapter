/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFAF4',
          100: '#F9F4E8',
          200: '#F2EAD3',
          300: '#E8DDBF',
        },
        earth: {
          50: '#F5F0E8',
          100: '#EDE8DC',
          200: '#DDD5C4',
          300: '#C9BFA8',
          400: '#A89880',
          500: '#8B7355',
          600: '#6B5840',
          700: '#4A3D2B',
          800: '#2C2416',
          900: '#1A1509',
        },
        terracotta: {
          50: '#FDF4F0',
          100: '#FAE5DB',
          200: '#F4C5B0',
          300: '#EBA080',
          400: '#DF7A56',
          500: '#C4603B',
          600: '#A34D2E',
          700: '#7D3A21',
          800: '#562717',
          900: '#33170D',
        },
        forest: {
          50: '#EDF7F1',
          100: '#D4ECDE',
          200: '#A8D9BC',
          300: '#77C297',
          400: '#4CA873',
          500: '#2D6A4F',
          600: '#215240',
          700: '#173B2E',
          800: '#0D261E',
          900: '#071410',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
