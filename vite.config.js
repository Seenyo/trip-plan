import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const googleMapsKey = process.env.GOOGLE_MAP_API_KEY || env.GOOGLE_MAP_API_KEY || '';
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';

  return {
    plugins: [react(), {
      name: 'offline-shell',
      apply: 'build',
      closeBundle() {
        const files = readdirSync('dist/assets').map((name) => `assets/${name}`);
        const version = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12);
        const template = readFileSync('scripts/sw-template.js', 'utf8');
        writeFileSync('dist/sw.js', template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(files)));
      },
    }],
    base: './',
    build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'supabase', test: /node_modules\/@supabase/ }] } } } },
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
    },
  };
});
