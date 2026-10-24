import { execSync } from "node:child_process";
import pg from "pg";

// Creates the test database if needed and syncs it to src/db/schema.ts.
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  const dbName = url.pathname.slice(1);
  // Safety: these tests truncate every table.
  if (!dbName.endsWith("_test") || url.hostname.includes("neon.tech")) {
    throw new Error(`Refusing to run tests against "${dbName}" on ${url.hostname}`);
  }

  const admin = new pg.Client({ connectionString: url.toString().replace(`/${dbName}`, "/postgres") });
  try {
    await admin.connect();
  } catch (e) {
    throw new Error(
      `Can't reach Postgres for tests. Run \`docker compose up -d\` first. (${(e as Error).message})`,
    );
  }
  const exists = await admin.query("select 1 from pg_database where datname = $1", [dbName]);
  if (exists.rowCount === 0) await admin.query(`create database "${dbName}"`);
  await admin.end();

  execSync("npx drizzle-kit push --force", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
}
