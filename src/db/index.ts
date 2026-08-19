import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// Local dev talks to plain Postgres (see docker-compose.yml) over the
// standard wire protocol; prod (Vercel + Neon) uses Neon's HTTP driver.
export const db = process.env.DATABASE_URL.includes("neon.tech")
  ? drizzleNeon(neon(process.env.DATABASE_URL), { schema })
  : drizzlePg(process.env.DATABASE_URL, { schema });
