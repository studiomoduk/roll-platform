import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;
type SqlInstance = ReturnType<typeof postgres>;

// Reuse a single client across hot reloads in dev.
const globalForDb = globalThis as unknown as {
  __palavaSql?: SqlInstance;
  __palavaDb?: DbInstance;
};

/**
 * Lazily create the connection on first use. We deliberately DON'T connect at
 * import time: Next.js evaluates route modules during `next build` (page-data
 * collection) when DATABASE_URL may be absent, and importing must not throw.
 */
function init(): { db: DbInstance; sql: SqlInstance } {
  if (globalForDb.__palavaDb && globalForDb.__palavaSql) {
    return { db: globalForDb.__palavaDb, sql: globalForDb.__palavaSql };
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase connection string.",
    );
  }
  const sqlClient = postgres(connectionString, { prepare: false });
  const dbClient = drizzle(sqlClient, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__palavaSql = sqlClient;
    globalForDb.__palavaDb = dbClient;
  }
  return { db: dbClient, sql: sqlClient };
}

/** Drizzle client — connects on first property access. */
export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    const real = init().db as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** Raw postgres client — connects on first property access (e.g. `sql.end()`). */
export const sql = new Proxy((() => {}) as unknown as SqlInstance, {
  get(_target, prop, receiver) {
    const real = init().sql as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
