import type { Config } from 'tailwindcss';
export default {
  content: [],
  theme: { extend: {
    colors: { void: 'var(--background)', surface: 'var(--surface)', gold: 'var(--gold)', border: 'var(--border)', ink: 'var(--text)' },
    fontFamily: { sans: ['var(--font-manrope)', 'Arial', 'sans-serif'] },
  } },
  plugins: [],
} satisfies Config;
