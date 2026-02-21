import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src/renderer'),
  base: './',
  publicDir: path.join(__dirname, 'public'),
  resolve: {
    alias: {
      'pdfjs-dist': path.join(__dirname, 'node_modules/pdfjs-dist'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    outDir: path.join(__dirname, 'dist-renderer'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('pdfjs-dist')) {
            return 'vendor-pdf';
          }

          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
