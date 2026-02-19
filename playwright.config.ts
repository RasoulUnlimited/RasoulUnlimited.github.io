import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.PW_PORT || 8080);
const baseURL = process.env.PW_BASE_URL || `http://127.0.0.1:${port}`;
const defaultChromePath =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const executablePath =
  process.env.PW_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync(defaultChromePath) ? defaultChromePath : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
