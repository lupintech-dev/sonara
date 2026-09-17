import fs from 'node:fs';
import * as acorn from 'acorn';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/migrate-and-fix.js <file...>');
  process.exit(1);
}

const DB_CALL_RE = /db\.prepare\(\s*([\s\S]*?)\s*\)\s*\.\s*(get|all|run)\s*\(((?:[^()]|\([^()]*\))*)\)/g;
const IMPORT_RE = /import\s*\{\s*db\s*\}\s*from\s*['"]\.\.\/db\/database\.js['"];?/g;

function containsAwait(fnNode) {
  let found = false;
  (function walk(n) {
    if (!n || typeof n !== 'object' || found) return;
    if (n.type === 'AwaitExpression') { found = true; return; }
    if (n !== fnNode && (
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    )) return;
    for (const key of Object.keys(n)) {
      if (key === 'start' || key === 'end' || key === 'loc') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.type) walk(v);
    }
  })(fnNode);
  return found;
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`  ! ${file} — not found`);
    continue;
  }

  const original = fs.readFileSync(file, 'utf8');
  let src = original;
  let changes = 0;

  // ---- 1. Replace import ----
  const beforeImport = src;
  src = src.replace(IMPORT_RE, "import { query, queryOne, execute } from '../db/turso.js';");
  if (src !== beforeImport) changes += 1;

  // ---- 2. Replace db.prepare(...).get/all/run(...) ----
  src = src.replace(DB_CALL_RE, (_match, sql, method, args) => {
    const fn = method === 'get' ? 'queryOne'
             : method === 'run' ? 'execute'
             : 'query';
    const trimmedSql = sql.trim();
    const trimmedArgs = args.trim();
    const argsArray = trimmedArgs === '' ? '[]' : `[${trimmedArgs}]`;
    changes += 1;
    return `(await ${fn}(${trimmedSql}, ${argsArray}))`;
  });

  // ---- 3. Parse with acorn (permissive: allow await outside async) ----
  let ast;
  try {
    ast = acorn.parse(src, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
  } catch (err) {
    console.log(`  ✗ ${file} — parse failed: ${err.message}`);
    // Still write if only the migrator ran but async fix couldn't apply
    if (src !== original) {
      fs.writeFileSync(file + '.bak', original, 'utf8');
      fs.writeFileSync(file, src, 'utf8');
      console.log(`    (migrator changes applied, async fix skipped)`);
    }
    continue;
  }

  // ---- 4. Find non-async functions that contain await ----
  const insertions = [];
  (function visit(n) {
    if (!n || typeof n !== 'object') return;

    const isFn =
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression';

    if (isFn && !n.async && containsAwait(n)) {
      insertions.push(n.start);
    }

    for (const key of Object.keys(n)) {
      if (key === 'start' || key === 'end' || key === 'loc') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object' && v.type) visit(v);
    }
  })(ast);

  // ---- 5. Apply insertions (descending order so offsets stay valid) ----
  insertions.sort((a, b) => b - a);
  for (const pos of insertions) {
    src = src.slice(0, pos) + 'async ' + src.slice(pos);
    changes += 1;
  }

  // ---- 6. Write ----
  if (src !== original) {
    if (!fs.existsSync(file + '.bak')) {
      fs.writeFileSync(file + '.bak', original, 'utf8');
    }
    fs.writeFileSync(file, src, 'utf8');
    console.log(`  ✓ ${file} (${changes} change${changes === 1 ? '' : 's'})`);
  } else {
    console.log(`  — ${file} (no changes)`);
  }
}

console.log('\nDone.');
