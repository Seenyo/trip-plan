import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const googleMapsKey = process.env.GOOGLE_MAP_API_KEY || env.GOOGLE_MAP_API_KEY || '';
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';

  return {
    plugins: [react()],
    base: './',
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
    },
  };
});
