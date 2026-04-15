import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // For GitHub Pages, the base URL should be the repository name if it's a project site
  // e.g., https://username.github.io/repo-name/ -> base: '/repo-name/'
  // We'll leave it as default ('/') but it can be overridden via environment variable
  const base = process.env.VITE_BASE_URL || '/';

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
