import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// Checks run the same pages on a local Node server; deployments use the Vercel adapter.
const adapter = process.env.BP_ADAPTER === 'node' ? node({ mode: 'standalone' }) : vercel();

export default defineConfig({
  output: 'static',
  adapter,
  vite: { plugins: [tailwindcss()] },
});
