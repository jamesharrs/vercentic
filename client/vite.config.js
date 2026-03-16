import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'module-records':   ['./src/Records.jsx'],
          'module-workflows': ['./src/Workflows.jsx'],
          'module-orgchart':  ['./src/OrgChart.jsx'],
          'module-settings':  ['./src/Settings.jsx'],
          'module-ai':        ['./src/AI.jsx'],
          'module-interviews':['./src/Interviews.jsx'],
          'module-offers':    ['./src/Offers.jsx'],
        }
      }
    }
  }
})

