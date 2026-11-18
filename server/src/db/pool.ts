import { Pool } from "pg";
import { getEnv } from "../config/env.js";

let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
