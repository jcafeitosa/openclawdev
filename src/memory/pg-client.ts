/**
 * PostgreSQL client singleton for the memory index backend.
 * Reuses the existing infra database connection (postgres.js).
 */

import { getDatabase } from "../infra/database/client.js";

export type PgSql = ReturnType<typeof getDatabase>;

let _pgSql: PgSql | null = null;

/**
 * Returns the shared PostgreSQL client singleton.
 * Reuses the existing infra/database/client getDatabase() instance.
 */
export function getPgClient(): PgSql {
  if (!_pgSql) {
    _pgSql = getDatabase();
  }
  return _pgSql;
}
