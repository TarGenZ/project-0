/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // CSS-variable driven — all change automatically with [data-theme="light"].
        // <alpha-value> preserves opacity modifiers: bg-base/85, border-line/20 etc.
        base:     'rgb(var(--color-base)     / <alpha-value>)',
        panel:    'rgb(var(--color-panel)    / <alpha-value>)',
        line:     'rgb(var(--color-line)     / <alpha-value>)',
        lavender: 'rgb(var(--color-lavender) / <alpha-value>)',
        // mid: between base and panel — used for inputs, select bg, filter bars
        mid:      'rgb(var(--color-mid)      / <alpha-value>)',
        // Fixed brand / status colours — never change with theme
        violet:   { DEFAULT: '#7C3AED', soft: '#9061F9' },
        amber:    '#F59E0B',
        success:  '#22C55E',
        danger:   '#EF4444',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      maxWidth: { page: '1400px' },
      boxShadow: {
        glow:   '0 4px 24px rgba(0,0,0,0.3)',
        violet: '0 8px 40px rgba(124,58,237,0.15)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        spin:      { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease forwards',
        'spin-slow': 'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
}
