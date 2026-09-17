/**
 * migrate-db.js
 * 
 * Converts route files from the synchronous SQLite API to the async Turso API.
 * 
 * Usage:
 *   node scripts/migrate-db.js routes/auth.js     # migrate one file
 *   node scripts/migrate-db.js routes             # migrate all .js files in folder
 * 
 * Backups are saved as <file>.bak
 * 
 * Transformations:
 *   db.prepare('SQL').get(a, b)   →  await queryOne('SQL', [a, b])
 *   db.prepare('SQL').all(a, b)   →  await query('SQL', [a, b])
 *   db.prepare('SQL').run(a, b)   →  await execute('SQL', [a, b])
 *   import { db } from '../db/database.js'
 *                                 →  import { query, queryOne, execute } from '../db/turso.js'
 */

import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2] || 'routes';
const targetPath = path.resolve(process.cwd(), target);

if (!fs.existsSync(targetPath)) {
  console.error(`Target not found: ${targetPath}`);
  process.exit(1);
}

let files = [];
const stat = fs.statSync(targetPath);
if (stat.isDirectory()) {
  files = fs.readdirSync(targetPath)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'))
    .map(f => path.join(targetPath, f));
} else {
  files = [targetPath];
}

console.log(`Scanning ${files.length} file(s)...\n`);

let totalChanged = 0;
let totalWarnings = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let content = original;
  let warnings = [];
  let changes = 0;

  // --- 1. Replace the import line ---
  const importBefore = content;
  content = content.replace(
    /import\s*\{\s*db\s*\}\s*from\s*['"]\.\.\/db\/database\.js['"];?/g,
    "import { query, queryOne, execute } from '../db/turso.js';"
  );
  if (content !== importBefore) changes++;

  // Warn if there are OTHER imports from database.js we might be missing
  if (/from\s*['"]\.\.\/db\/database\.js['"]/.test(content)) {
    warnings.push('Still imports from database.js (non-{db} import) — check manually');
  }

  // --- 2. Replace db.prepare(...).get/all/run(...) ---
  const dbCallRe = /db\.prepare\(\s*([\s\S]*?)\s*\)\s*\.\s*(get|all|run)\s*\(((?:[^()]|\([^()]*\))*)\)/g;

  content = content.replace(dbCallRe, (match, sql, method, args) => {
    const fn = method === 'get' ? 'queryOne'
             : method === 'run' ? 'execute'
             : 'query';
    const trimmedSql = sql.trim();
    const trimmedArgs = args.trim();
    const argsArray = trimmedArgs === '' ? '[]' : `[${trimmedArgs}]`;
    changes++;
    return `await ${fn}(${trimmedSql}, ${argsArray})`;
  });

  // --- 3. Warn about unfixable patterns ---
  const leftoverPatterns = [
    { re: /db\.exec\s*\(/g, msg: 'db.exec() still present — needs manual transaction handling' },
    { re: /db\.transaction\s*\(/g, msg: 'db.transaction() still present — needs manual handling' },
    { re: /db\.prepare\s*\(/g, msg: 'db.prepare() still present — regex may have missed a case' },
  ];
  for (const { re, msg } of leftoverPatterns) {
    if (re.test(content)) warnings.push(msg);
  }

  // --- 4. Warn if we inserted await into a non-async function ---
  // Heuristic: check if any route handler is not async but contains await query/execute/queryOne
  if (/router\.(get|post|put|delete|patch)\s*\([^,]+,\s*\(\s*req\s*,\s*res\s*\)/.test(content)) {
    if (/await\s+(query|queryOne|execute)\s*\(/.test(content)) {
      warnings.push('Possible await inside non-async handler — check manually');
    }
  }

  // --- Save if changed ---
  if (content !== original) {
    const backupPath = file + '.bak';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, original, 'utf8');
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ ${path.relative(process.cwd(), file)} (${changes} change${changes === 1 ? '' : 's'})`);
    totalChanged++;
  } else {
    console.log(`— ${path.relative(process.cwd(), file)} (no changes)`);
  }

  if (warnings.length > 0) {
    warnings.forEach(w => console.log(`    ⚠ ${w}`));
    totalWarnings++;
  }
}

console.log('');
console.log(`Done. ${totalChanged} file(s) changed, ${totalWarnings} file(s) with warnings.`);
if (totalChanged > 0) {
  console.log('');
  console.log('Backups saved as <file>.bak');
  console.log('To restore a file: mv routes/auth.js.bak routes/auth.js');
}
