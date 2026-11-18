import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite + React. The dev server proxies /api to the local backend so the
 * client can call relative URLs in development; in production the client uses
 * VITE_API_BASE (set on Vercel) to reach the Render backend.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
