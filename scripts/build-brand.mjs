// Builds one brand for one environment into its own folder: node scripts/build-brand.mjs <brand> <preview|production> [node|vercel]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const [brand, env = 'preview', adapter = 'node'] = process.argv.slice(2);
if (!brand) { console.error('usage: build-brand.mjs <brand> <preview|production> [node|vercel]'); process.exit(2); }
const cwd = path.join(ROOT, 'apps', brand);
const outDir = adapter === 'node' ? `dist-${env}` : 'dist';
execFileSync('npx', ['astro', 'build', '--outDir', outDir, '--silent'], {
  cwd,
  stdio: 'inherit',
  env: { ...process.env, BP_ADAPTER: adapter, PUBLIC_DEPLOY_ENV: env },
});
console.log(`built ${brand} (${env}, ${adapter}) -> apps/${brand}/${outDir}`);
