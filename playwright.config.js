// playwright.config.js
// Run with: npx playwright test
// Headed:   npx playwright test --headed
// One file: npx playwright test e2e/core/auth.spec.js
// UI mode:  npx playwright test --ui
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir:   './e2e',
  timeout:    30_000,
  retries:    process.env.CI ? 2 : 0,
  workers:    1,   // serial — single DB, no parallel state conflicts
  reporter:  [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],

  use: {
    baseURL:           'http://localhost:3000',
    headless:          true,
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    trace:             'retain-on-failure',
    // Attach session cookie automatically (credentials: include)
    extraHTTPHeaders: { 'Accept': 'application/json' },
  },

  projects: [
    // ── Core platform tests ────────────────────────────────────────────────
    {
      name:    'core',
      testDir: './e2e/core',
      use:     { ...devices['Desktop Chrome'] },
    },
    // ── Per-client regression suites ──────────────────────────────────────
    // Add a new project per client; each points at their live environment.
    // Example (uncomment when a client is provisioned):
    // {
    //   name:    'client-acme',
    //   testDir: './e2e/clients/acme-corp',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     baseURL: 'https://client-gamma-ruddy-63.vercel.app',
    //   },
    // },
  ],

  // Start both servers before running tests
  webServer: [
    {
      command:              'node server/index.js',
      cwd:                  '/Users/james/projects/talentos',
      url:                  'http://localhost:3001/api/health',
      reuseExistingServer:  true,
      env: { NODE_ENV: 'development', PLAYWRIGHT_TEST: '1', ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '' },
    },
    {
      command:              'npm run dev',
      cwd:                  '/Users/james/projects/talentos/client',
      url:                  'http://localhost:3000',
      reuseExistingServer:  true,
    },
  ],
});
