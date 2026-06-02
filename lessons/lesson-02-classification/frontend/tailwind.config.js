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
          // Surfaces — rich desaturated dark, no pure black. Successive
          // tones lighten to simulate elevation (page → card → hover).
          bg:      '#0B0F19',
          surface: '#161B26',
          dim:     '#1F2937',

          // Borders — translucent white so they fade gracefully on any
          // surface tone and don't read as harsh dividers.
          border:  'rgba(255, 255, 255, 0.08)',

          // Typography — off-white primary, muted gray secondary,
          // dim gray for disabled state.
          text:     '#F8FAFC',
          muted:    '#94A3B8',
          disabled: '#64748B',

          // Accents — indigo for interactive (buttons, focus rings,
          // active tabs), emerald for positive/success states.
          accent:        '#6366F1',
          'accent-hover': '#4F46E5',
          bright:        '#10B981',
        },
      },
    },
  },
  plugins: [typography],
}
