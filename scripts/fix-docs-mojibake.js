/**
 * Corrige caracteres mal codificados (mojibake) en docs.
 * Ejecutar: node scripts/fix-docs-mojibake.js
 */
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
function findMdFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      findMdFiles(p, acc);
    else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.txt')))
      acc.push(path.relative(path.join(__dirname, '..'), p).replace(/\\/g, '/'));
  }
  return acc;
}

const REPLACEMENTS = [
  ['\u00C3\u00B1', '\u00F1'],  // Ã± -> ñ
  ['\u00C3\u00B3', '\u00F3'],  // Ã³ -> ó
  ['\u00C3\u00AD', '\u00ED'],  // Ã­ -> í
  ['\u00C3\u00A1', '\u00E1'],  // Ã¡ -> á
  ['\u00C3\u00BA', '\u00FA'],  // Ãº -> ú
  ['\u00C3\u00A9', '\u00E9'],  // Ã© -> é
  ['\u00C3\u00BC', '\u00FC'],  // Ã¼ -> ü
  ['\u00E2\u2020\u2019', '\u2192'],  // â†' -> →
  ['\u00E2\u0080\u009C', '"'], ['\u00E2\u0080\u009D', '"'],
  ['\u00E2\u0080\u0093', '\u2013'],  // en dash
  ['\u201C\u201D', '\u2013'],
  ['\u00CD\u00BC', '\u00FC'],  // Í¼ -> ü (ambigüedad)
].sort((a, b) => b[0].length - a[0].length);

function fix(text) {
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

let modified = 0;
for (const rel of findMdFiles(docsDir)) {
  const full = path.join(__dirname, '..', rel);
  const raw = fs.readFileSync(full, 'utf8');
  const fixed = fix(raw);
  if (raw !== fixed) {
    fs.writeFileSync(full, fixed, 'utf8');
    modified++;
    console.log('Fixed:', rel);
  }
}
console.log('Done. Modified:', modified);
