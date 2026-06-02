import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        crt: {
          bg:      '#0a0f0a',
          surface: '#0f1a0f',
          border:  '#1a3a1a',
          dim:     '#1f4a2a',
          muted:   '#4a9e5a',
          text:    '#33ff57',
          bright:  '#80ff9a',
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', '"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [typography],
}
