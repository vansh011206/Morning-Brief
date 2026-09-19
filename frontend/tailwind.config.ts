import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          strong: '#4338CA',
          soft: '#EEF2FF',
          glow: 'rgba(79, 70, 229, 0.12)',
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
        sunrise: {
          DEFAULT: '#F59E0B',
          soft: '#FFFBEB',
          glow: 'rgba(245, 158, 11, 0.12)',
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
        success: '#10B981',
        danger: '#E11D48',
        ink: '#18181B',
        body: '#3F3F46',
        muted: '#71717A',
        sidebar: '#0F0F0F',
        dark: '#111113',
        paper: '#FCFCF9',
        canvas: {
          DEFAULT: '#F8F7F4',
          subtle: '#F2EFE9',
          card: '#FFFFFF',
        },
        card: '#FFFFFF',
        skeleton: '#F4F4F5',
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
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '20': '20px',
        '24': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'xl': '0 16px 48px rgba(0, 0, 0, 0.16)',
        'indigo': '0 8px 24px rgba(79, 70, 229, 0.15)',
        'amber': '0 8px 24px rgba(245, 158, 11, 0.12)',
        'dark-lg': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
}

export default config
