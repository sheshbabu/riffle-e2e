import { defineConfig, devices } from '@playwright/test';

const port = process.env.RIFFLE_E2E_PORT || '8092';

// The server starts on empty folders every run, so the functional and visual suites run separately.
// The visual screenshots need the library exactly as the import left it, which the functional tests would change.
const isVisual = process.env.VISUAL === '1';

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

const importSetup = {
  name: 'setup',
  testMatch: /tests\/import\.setup\.js/,
  use: desktop,
};

const functionalProjects = [
  {
    name: 'desktop',
    testMatch: /tests\/.*\.spec\.js/,
    dependencies: ['setup'],
    use: desktop,
  },
];

// riffle is dark-only and has no mobile layout, so one desktop project covers it.
// Dates come from the fixtures' EXIF, so only the timezone and locale need fixing.
const visualProjects = [
  {
    name: 'seed',
    testMatch: /visual\/seed\.setup\.js/,
    dependencies: ['setup'],
  },
  {
    name: 'visual',
    testMatch: /visual\/.*\.spec\.js/,
    dependencies: ['seed'],
    use: { ...desktop, timezoneId: 'UTC', locale: 'en-US' },
  },
];

export default defineConfig({
  testDir: '.',
  // All specs share one server and one library, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Baselines are only ever recorded on macOS, so the platform suffix is left out.
  snapshotPathTemplate: 'visual/__screenshots__/{arg}{ext}',
  expect: {
    // riffle polls long-running operations every 5 seconds.
    timeout: 15_000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'sh start.sh',
    url: `http://localhost:${port}/api/settings/`,
    // A server left running would carry an old library.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [importSetup, ...(isVisual ? visualProjects : functionalProjects)],
});
