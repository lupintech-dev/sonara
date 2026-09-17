/**
 * Turso Client Wrapper
 * 
 * Dev:  connects to local file `backend/sonara.db`
 * Prod: connects to Turso remote URL via env vars
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'file:./sonara.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log(`[db] Connecting to: ${url.startsWith('file:') ? 'local SQLite file (' + url + ')' : 'Turso remote'}`);

export const db = createClient({
  url,
  authToken: authToken || undefined,
});

/** Convert a libsql Row to a plain object. */
function rowToObject(row) {
  if (!row) return null;
  if (typeof row.toJSON === 'function') return row.toJSON();
  if (typeof row.toArray === 'function') {
    const cols = row.columns || [];
    const arr = row.toArray();
    const out = {};
    cols.forEach((c, i) => { out[c] = arr[i]; });
    return out;
  }
  const out = {};
  for (const key of Object.keys(row)) out[key] = row[key];
  return out;
}

// Helper: run a query and return all rows (as plain objects)
export async function query(sql, params = []) {
  const result = await db.execute(sql, params);
  return result.rows.map(rowToObject);
}

// Helper: run a query and return the first row
export async function queryOne(sql, params = []) {
  const result = await db.execute(sql, params);
  return rowToObject(result.rows[0]);
}

// Helper: run an insert/update/delete
export async function execute(sql, params = []) {
  const result = await db.execute(sql, params);
  return {
    changes: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid !== undefined
      ? Number(result.lastInsertRowid)
      : null,
  };
}

// Helper: run multiple statements inside a transaction
export async function transaction(fn) {
  const tx = await db.transaction('write');
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
