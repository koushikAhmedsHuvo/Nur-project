// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'stream-vendor': ['@stream-io/video-react-sdk'],
          'ui-vendor': ['react-icons', 'react-hot-toast', 'zustand'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },

  // Preview server
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  
  base: '/',
  
  // Path aliases
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@hooks': '/src/hooks',
      '@lib': '/src/lib',
      '@store': '/src/store',
      '@constants': '/src/constants',
    },
  },
})