import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset URLs so the build can be served from a subfolder
// (GitHub Pages publishes it under /<repositório>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // pdf.js is loaded on demand, only when a nota is imported; keep it out of
    // the main chunk and out of the size warning.
    chunkSizeWarningLimit: 600,
  },
});
