import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0A0E1A',
        surface: '#131826',
        card: '#1A2030',
        edge: '#2A3348',
        bone: '#F5F0E1',
        muted: '#A8B0C0',
        gold: '#D4AF37',
        emerald: '#10B981',
        crimson: '#8B0000',
        iblis: '#4B0082',
        faith: '#22C55E',
        danger: '#DC2626',
        legendary: '#FBBF24',

        /* category colors */
        cat: {
          faith: '#22C55E',
          intelligence: '#3B82F6',
          strength: '#DC2626',
          charisma: '#D4AF37',
          discipline: '#A855F7',
          bad_habit: '#64748B',
        },

        /* rarity colors */
        rarity: {
          common: '#9CA3AF',
          rare: '#3B82F6',
          epic: '#A855F7',
          legendary: '#FBBF24',
          mythic: '#EC4899',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        arabic: ['Amiri', 'Traditional Arabic', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(212, 175, 55, 0.35)',
        emerald: '0 0 20px rgba(16, 185, 129, 0.35)',
        crimson: '0 0 24px rgba(139, 0, 0, 0.5)',
        iblis: '0 0 40px rgba(75, 0, 130, 0.55)',
        inset: 'inset 0 1px 0 rgba(245, 240, 225, 0.06)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%': { transform: 'translate(-6px, 2px)' },
          '40%': { transform: 'translate(5px, -3px)' },
          '60%': { transform: 'translate(-4px, -2px)' },
          '80%': { transform: 'translate(3px, 3px)' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.8)' },
          '15%': { opacity: '1', transform: 'translateY(-10px) scale(1.15)' },
          '100%': { opacity: '0', transform: 'translateY(-70px) scale(1)' },
        },
        pulseAura: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.06)' },
        },
        smokeIn: {
          '0%': { opacity: '0', filter: 'blur(24px)' },
          '100%': { opacity: '1', filter: 'blur(0px)' },
        },
        dissolve: {
          '0%': { opacity: '1', filter: 'blur(0)' },
          '100%': { opacity: '0', filter: 'blur(12px)', transform: 'translateY(14px) scale(0.92)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        riseGlow: {
          '0%': { opacity: '0', transform: 'scaleY(0)' },
          '40%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'scaleY(1.6)' },
        },
      },
      animation: {
        shake: 'shake 200ms ease-in-out',
        'float-up': 'floatUp 1100ms ease-out forwards',
        'pulse-aura': 'pulseAura 2.8s ease-in-out infinite',
        'smoke-in': 'smokeIn 700ms ease-out forwards',
        dissolve: 'dissolve 900ms ease-in forwards',
        shimmer: 'shimmer 2.4s linear infinite',
        'rise-glow': 'riseGlow 1400ms ease-out forwards',
      },
    },
  },
  plugins: [animate],
};

export default config;
