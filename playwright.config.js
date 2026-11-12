import { defineConfig, devices } from '@playwright/test';

// SERVE_DIR=dist runs the same tests against the production build (npm run test:dist).
const dir = process.env.SERVE_DIR || '.';
const port = process.env.SERVE_DIR ? 8081 : 8080;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 860 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } }],
  webServer: {
    command: `npx http-server ${dir} -p ${port} -c-1 -s`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.SERVE_DIR,
    timeout: 30_000,
  },
});
