import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sportsdb': {
        target: 'https://www.thesportsdb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sportsdb/, '')
      },
      '/api/translate': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/translate/, '')
      }
    }
  }
})
