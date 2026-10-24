import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests run against a throwaway local Postgres database, never
// the DATABASE_URL in .env.local. Start it with `docker compose up -d`.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/thursday_ball_test";

// globalSetup runs in this process, which test.env below does not reach.
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setup.ts", "tests/setup.dom.ts"],
    // Files share one database, so run them one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      TZ: "UTC",
    },
  },
});
