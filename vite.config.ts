import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the UpGrid SPA. Production build → dist/ (Amplify artifact baseDirectory).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
