import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
