import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // For GitHub Pages, using a relative base path ('./') ensures assets load correctly
  // regardless of the repository name or if it's a user/project site.
  const base = './';

  return {
    base,
    plugins: [react()],
    define: {
      // Expose the API key to the client side. 
      // WARNING: In a real production app, exposing the API key to the client is a security risk.
      // Since GitHub Pages only hosts static files, this is the only way to make it work without a backend.
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
