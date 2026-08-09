import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'GOOGLE_MAP_API_KEY');
  const googleMapsKey = process.env.GOOGLE_MAP_API_KEY || env.GOOGLE_MAP_API_KEY || '';

  return {
    plugins: [react()],
    base: './',
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsKey),
    },
  };
});
