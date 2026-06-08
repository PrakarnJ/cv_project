/** @type {import('tailwindcss').Config} */
// CRT / terminal palette carried over from v1 so v2 feels like the same product.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crt: {
          bg: '#0a0e0a',
          panel: '#111811',
          border: '#1f2a1f',
          text: '#c8f7c8',
          dim: '#5f8f5f',
          accent: '#39ff14',
          amber: '#ffb000',
          red: '#ff5555',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
