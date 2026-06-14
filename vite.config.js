import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [],
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('core-js')) return
        warn(warning)
      },
    },
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },
})
