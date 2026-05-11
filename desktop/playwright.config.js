const { defineConfig, devices } = require('/home/yusney/app/notes/desktop/node_modules/@playwright/test');

module.exports = defineConfig({
  testDir: '/home/yusney/app/notes/desktop/e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'CHOKIDAR_USEPOLLING=true npx vite --host --port 1420',
    url: 'http://localhost:1420',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
