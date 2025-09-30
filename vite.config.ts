import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Mejor rendimiento en Windows
    watch: {
      usePolling: false,
      interval: 100
    },
    // HMR más rápido
    hmr: {
      overlay: true
    },
    // Puerto fijo
    port: 5173,
    strictPort: true,
    // Abrir automáticamente
    open: false
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'lucide-react', 
      'react-router-dom',
      '@supabase/supabase-js'
    ]
  },
  // Build optimizations
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['lucide-react']
        }
      }
    }
  }
});