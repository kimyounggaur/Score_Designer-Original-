import { defineConfig, devices } from '@playwright/test';

const isProd = Boolean(process.env.PROD_BASE_URL);
const port = Number(process.env.PORT || 8080);
const localBaseURL = `http://127.0.0.1:${port}/`;
const baseURL = process.env.PROD_BASE_URL
  ? process.env.PROD_BASE_URL.replace(/\/?$/, '/')
  : localBaseURL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required', '--disable-quic'],
    },
  },
  webServer: isProd
    ? undefined
    : {
        command: `npx http-server . -p ${port} -c-1`,
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
