// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.TSAKANI_EVIDENCE_DIR
      ? `${process.env.TSAKANI_EVIDENCE_DIR}/results.json`
      : 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'https://etalente.co.za',
    ...(process.env.HTTPS_PROXY
      ? { proxy: { server: process.env.HTTPS_PROXY, bypass: process.env.NO_PROXY } }
      : {}),
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
