import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase connection string.",
  );
}

// Reuse a single client across hot reloads in dev.
const globalForDb = globalThis as unknown as {
  __palavaSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb.__palavaSql ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__palavaSql = sql;
}

export const db = drizzle(sql, { schema });
export { sql };
