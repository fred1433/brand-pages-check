import { defineConfig } from '@playwright/test';
import { targets } from './tests/e2e/targets.mjs';

// Local checks start one server per brand and environment from the builds in apps/<brand>/dist-<env>.
// A deployed check sets BP_BASE_URL (and BP_EXPECT_ENV) and starts nothing.
const remote = !!process.env.BP_BASE_URL;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e.json' }]],
  use: { headless: true },
  webServer: remote
    ? undefined
    : targets().map((t) => ({
        command: `node apps/${t.brand}/dist-${t.env}/server/entry.mjs`,
        url: t.baseURL,
        env: { PORT: String(t.port), HOST: '127.0.0.1', VERCEL_ENV: t.env },
        reuseExistingServer: false,
        timeout: 30_000,
      })),
});
