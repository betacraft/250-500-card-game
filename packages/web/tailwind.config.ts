import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: '#1A6E4A', dark: '#155539' },
        gold: { DEFAULT: '#F5C41E', dark: '#4A3000', border: '#8A6700' },
        surface: { warm: '#F5F1E8', white: '#FFFFFF' },
        suit: { red: '#B53132', black: '#222222' },
        border: { light: '#E5E1D7' },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontVariantNumeric: { 'tabular-nums': 'tabular-nums' },
    },
  },
  plugins: [],
};
export default config;
