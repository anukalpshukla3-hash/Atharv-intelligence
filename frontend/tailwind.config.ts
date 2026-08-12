import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07070b',
          900: '#0b0b12',
          850: '#0f0f18',
          800: '#12121d',
          700: '#1a1a28',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          soft: 'rgba(255,255,255,0.04)',
        },
        accent: {
          DEFAULT: '#4d8dff',
          bright: '#6ba2ff',
          dim: '#2c5bbd',
        },
        mag: {
          DEFAULT: '#d946ef',
          dim: '#a21caf',
        },
        mint: '#34d399',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 28px -6px rgba(77,141,255,0.55)',
        'glow-mag': '0 0 28px -8px rgba(217,70,239,0.5)',
        panel: '0 24px 70px -24px rgba(0,0,0,0.85)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(24px, -28px) scale(1.06)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.25', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-2px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        blink: 'blink 1.1s step-end infinite',
        scan: 'scan 16s linear infinite',
        spin: 'spin 0.8s linear infinite',
        float: 'float 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
