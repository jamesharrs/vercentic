import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 90000,          // 90 s — AI generation can take 30-40 s
        proxyTimeout: 90000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Pass the real client origin so the server can build correct reschedule URLs
            const host = req.headers['host'] || 'localhost:3000';
            proxyReq.setHeader('X-App-Origin', `http://${host}`);
          });
        },
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
        manualChunks(id) {
          // All React + scheduler code → single vendor chunk (no duplicates)
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-is/') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('/node_modules/use-sync-external-store/')
          ) {
            return 'vendor-react';
          }
          // Recharts + D3 → own chunk
          if (id.includes('/node_modules/recharts') || id.includes('/node_modules/d3-')) {
            return 'vendor-charts';
          }
          // App module chunks (large files get their own chunk)
          if (id.includes('/src/Records.jsx'))    return 'module-records';
          if (id.includes('/src/Workflows.jsx'))  return 'module-workflows';
          if (id.includes('/src/OrgChart.jsx'))   return 'module-orgchart';
          if (id.includes('/src/Settings.jsx'))   return 'module-settings';
          if (id.includes('/src/AI.jsx'))         return 'module-ai';
          if (id.includes('/src/Interviews.jsx')) return 'module-interviews';
          if (id.includes('/src/Offers.jsx'))     return 'module-offers';
          if (id.includes('/src/Reports.jsx'))    return 'module-reports';
          if (
            id.includes('/src/DashboardBuilder.jsx') ||
            id.includes('/src/DashboardViewer.jsx')
          ) return 'module-dashboard';
        }
      }
    }
  }
})
