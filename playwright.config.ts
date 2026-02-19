import fs from "node:fs";
import os from "node:os";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.PW_PORT || 8080);
const baseURL = process.env.PW_BASE_URL || `http://127.0.0.1:${port}`;
const defaultChromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const executablePath =
  process.env.PW_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync(defaultChromePath) ? defaultChromePath : undefined);

const isCI = !!process.env.CI;
const defaultLocalWorkers = Number(process.env.PW_WORKERS || 1);
const fullyParallel = process.env.PW_FULLY_PARALLEL === "true";
const localCpuHint =
  typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length;
const effectiveWorkers = isCI
  ? 1
  : Math.max(1, Math.min(defaultLocalWorkers, Math.max(1, localCpuHint)));

const launchArgs = [
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--disable-dev-shm-usage",
  "--disable-background-networking",
];

if (isCI) {
  launchArgs.push("--no-sandbox", "--disable-setuid-sandbox");
}

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: effectiveWorkers,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    headless: true,
    trace: isCI ? "on-first-retry" : "off",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          args: launchArgs,
        },
      },
    },
  ],
  webServer: {
    command: isCI ? "npm run build && npm run start" : "npm run start",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
