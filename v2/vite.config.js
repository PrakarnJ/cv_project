import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// v2 dev server runs on 5175 so it never collides with v1's frontend (5174).
export default defineConfig({
  plugins: [react()],
  server: { port: 5175 },
})
