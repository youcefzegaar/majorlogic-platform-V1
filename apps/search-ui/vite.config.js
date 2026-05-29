import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DEV_API = process.env.VITE_API_URL || 'http://localhost:3010';

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls in development so auth cookies are same-origin (no SameSite issues).
    proxy: {
      '/auth': { target: DEV_API, changeOrigin: true },
      '/user': { target: DEV_API, changeOrigin: true },
      '/api':  { target: DEV_API, changeOrigin: true },
      '/go':   { target: DEV_API, changeOrigin: true },
    },
  },
  build: {
    // Phase-level code splitting — each lazy-loaded phase becomes its own chunk
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('node_modules/react/')) return 'vendor';
          if (id.includes('zustand')) return 'state';
          if (id.includes('react-i18next') || id.includes('i18next')) return 'i18n';
          if (id.includes('recharts')) return 'charts';
        },
      },
    },
    // Bundle budget: warn at 500 kB, error at 1 MB per chunk
    chunkSizeWarningLimit: 500,
  },
})
