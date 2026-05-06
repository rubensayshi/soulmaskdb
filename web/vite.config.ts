import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = process.env.VITE_BACKEND_PORT || '9060'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${backendPort}`,
      '/icons': `http://localhost:${backendPort}`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
