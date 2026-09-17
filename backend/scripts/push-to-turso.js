import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import dotenv from 'dotenv';

dotenv.config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

console.log('Connecting to Turso...');
console.log('  URL:', process.env.TURSO_DATABASE_URL);
console.log('');

// 1. Check what's in the cloud DB
console.log('=== Cloud DB tables ===');
let cloudTables = [];
try {
  const r = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  cloudTables = r.rows.map(row => row.name);
  console.log('  Tables found:', cloudTables.length);
  for (const t of cloudTables) {
    const c = await turso.execute(`SELECT COUNT(*) AS c FROM "${t}"`);
    console.log(`    - ${t}: ${c.rows[0].c} rows`);
  }
} catch (err) {
  console.error('  Error:', err.message);
}

console.log('');

// 2. Read local DB schema + data
console.log('=== Local DB ===');
const local = new DatabaseSync('./sonara.db');
const localTables = local.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('  Tables found:', localTables.length);

for (const t of localTables) {
  const c = local.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get();
  console.log(`    - ${t.name}: ${c.c} rows`);
}

// 3. Push schema + data if cloud is empty
const cloudHasData = cloudTables.length > 0 && 
  (await turso.execute(`SELECT COUNT(*) AS c FROM users`).catch(() => ({ rows: [{ c: 0 }] }))).rows[0].c > 0;

if (cloudHasData) {
  console.log('');
  console.log('Cloud DB already has data. Skipping push.');
  console.log('If you want to force re-push, drop tables first.');
} else {
  console.log('');
  console.log('=== Pushing local schema + data to Turso ===');
  
  for (const t of localTables) {
    console.log(`  Creating table: ${t.name}`);
    try {
      await turso.execute(t.sql);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn(`    Warning: ${err.message}`);
      }
    }
  }
  
  // Push rows
  let totalPushed = 0;
  for (const t of localTables) {
    const rows = local.prepare(`SELECT * FROM "${t.name}"`).all();
    if (rows.length === 0) continue;
    
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${t.name}" (${colList}) VALUES (${placeholders})`;
    
    let pushed = 0;
    for (const row of rows) {
      const values = cols.map(c => row[c]);
      try {
        await turso.execute({ sql: insertSql, args: values });
        pushed++;
      } catch (err) {
        console.warn(`    Failed row in ${t.name}:`, err.message);
      }
    }
    totalPushed += pushed;
    console.log(`  ${t.name}: pushed ${pushed}/${rows.length} rows`);
  }
  
  console.log('');
  console.log(`Total rows pushed: ${totalPushed}`);
}

console.log('');
console.log('=== Verification ===');
const finalCounts = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
for (const row of finalCounts.rows) {
  const c = await turso.execute(`SELECT COUNT(*) AS c FROM "${row.name}"`);
  console.log(`  ${row.name}: ${c.rows[0].c} rows`);
}

console.log('');
console.log('Done.');
local.close();
process.exit(0);
