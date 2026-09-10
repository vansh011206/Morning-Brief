import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FAFAF9',
          subtle: '#F5F5F4',
          card: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        amber: {
          DEFAULT: '#F59E0B',
          sunrise: '#F59E0B',
          'sunrise-light': '#FFFBEB',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        emerald: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        rose: {
          DEFAULT: '#E11D48',
          50: '#FFF1F2',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-glow': '0 0 50px -12px rgba(79, 70, 229, 0.15)',
        'amber-glow': '0 0 35px -8px rgba(245, 158, 11, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}

export default config
