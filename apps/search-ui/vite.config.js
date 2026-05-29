import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Phase-level code splitting — each lazy-loaded phase becomes its own chunk
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          vendor: ['react', 'react-dom'],
          // State management
          state: ['zustand'],
          // i18n (large, rarely changes)
          i18n: ['react-i18next', 'i18next'],
          // Admin/heavy components loaded lazily
          charts: ['recharts'],
        },
      },
    },
    // Bundle budget: warn at 500 kB, error at 1 MB per chunk
    chunkSizeWarningLimit: 500,
  },
})
