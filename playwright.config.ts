import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const env = {
  DATABASE_URL: `file:${path.join(__dirname, "prisma", "e2e.db")}`,
  UPLOAD_DIR: path.join(__dirname, "data", "e2e-uploads"),
  NEXTAUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret",
  NEXTAUTH_URL: `http://localhost:${PORT}`,
  PORT: String(PORT),
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
      },
    },
    {
      // 小さめの Android 端末（幅 360px）で崩れないことを確認する
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 740 } },
    },
  ],
  webServer: {
    command:
      "rm -f prisma/e2e.db && rm -rf data/e2e-uploads && npx prisma migrate deploy && npx next start -p 3100",
    url: `http://localhost:${PORT}`,
    env,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
