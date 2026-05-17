import { defineConfig } from 'vite'
import { createRequire } from 'module'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
const { tauriPort } = require('./dev-ports.cjs')
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: tauriPort,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: tauriPort + 1 } : undefined,
    watch: { usePolling: true },
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
