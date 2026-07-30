import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,   // fail instead of auto-incrementing port
    proxy: {
      // Proxy /api requests to the Express server
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy Socket.io — must forward the WebSocket upgrade too
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,   // ← this is the critical flag for WebSocket proxying
      },
    },
  },
})
