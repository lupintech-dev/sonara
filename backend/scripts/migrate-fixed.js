import fs from 'node:fs';
import * as acorn from 'acorn';

const files = process.argv.slice(2);
if (files.length === 0) { console.error('Usage: node scripts/migrate-fixed.js <file...>'); process.exit(1); }

const IMPORT_RE = /import\s*\{\s*db\s*\}\s*from\s*['"]\.\.\/db\/database\.js['"];?/g;
const DB_CALL_RE = /db\.prepare\(\s*([\s\S]*?)\s*\)\s*\.\s*(get|all|run)\s*\(((?:[^()]|\([^()]*\))*)\)/g;

for (const file of files) {
  if (!fs.existsSync(file)) { console.log(`  ! ${file} not found`); continue; }
  const original = fs.readFileSync(file, 'utf8');

  // --- Parse the ORIGINAL (safe — no await yet) ---
  let ast;
  try {
    ast = acorn.parse(original, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (err) {
    console.log(`  ✗ ${file} parse failed: ${err.message}`);
    continue;
  }

  // --- Find every function whose body needs async ---
  // A function needs async if its body contains db.prepare(...) (which will become await)
  // OR if it already contains `await` from a previous partial run.
  const asyncPositions = new Set();

  function bodyNeedsAsync(fnNode) {
    if (!fnNode.body) return false;
    const bodyText = original.slice(fnNode.body.start, fnNode.body.end);
    return /db\.prepare\s*\(/.test(bodyText) || /\bawait\b/.test(bodyText);
  }

  function visit(n) {
    if (!n || typeof n !== 'object') return;
    const isFn =
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression';
    if (isFn && !n.async && bodyNeedsAsync(n)) {
      asyncPositions.add(n.start);
    }
    for (const key of Object.keys(n)) {
      if (['start','end','loc'].includes(key)) continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object' && v.type) visit(v);
    }
  }
  visit(ast);

  // --- Apply async insertions FIRST (descending so offsets stay valid) ---
  let src = original;
  const sortedPositions = Array.from(asyncPositions).sort((a, b) => b - a);
  for (const pos of sortedPositions) {
    src = src.slice(0, pos) + 'async ' + src.slice(pos);
  }

  // --- Then apply pattern replacements (position-agnostic) ---
  src = src.replace(IMPORT_RE, "import { query, queryOne, execute } from '../db/turso.js';");

  src = src.replace(DB_CALL_RE, (_m, sql, method, args) => {
    const fn = method === 'get' ? 'queryOne'
             : method === 'run' ? 'execute'
             : 'query';
    const t = args.trim();
    const arr = t === '' ? '[]' : `[${t}]`;
    return `(await ${fn}(${sql.trim()}, ${arr}))`;
  });

  if (src !== original) {
    if (!fs.existsSync(file + '.bak')) fs.writeFileSync(file + '.bak', original, 'utf8');
    fs.writeFileSync(file, src, 'utf8');
    console.log(`  ✓ ${file} (${sortedPositions.length} async, migrated)`);
  } else {
    console.log(`  — ${file} (no changes)`);
  }
}
console.log('\nDone.');
