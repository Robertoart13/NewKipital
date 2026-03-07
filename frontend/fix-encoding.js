#!/usr/bin/env node
// Fix double/triple UTF-8 encoding issues (mojibake) + BOM across entire project
// Run from project root: node -e "require('./frontend/fix-encoding.js')"

const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  ['\u00C3\u0083\u00C2\u00A2\u00C3\u00A2\u00E2\u0080\u009A\u00C2\u00AC\u00C3\u00A2\u00E2\u0082\u00AC\u00C2\u009D', '\u2014'],
  ['\u00C3\u00A2\u00E2\u0082\u00AC\u00E2\u0080\u009D', '\u2014'],
  ['\u00C3\u00A2\u00E2\u0082\u00AC\u00C2\u00A6', '\u2026'],
  ['\u00C3\u00A2\u00E2\u0080\u00B0\u00C2\u00A5', '\u2265'],
  ['\u00C2\u00BF', '\u00BF'],
  ['\u00C2\u009D', '\u00E1'],
  ['\u00C3\u0083\u00C5\u00A1', '\u00DA'],
  ['\u00C3\u2014', '\u00D7'],
  ['\u00E2\u2020\u2019', '\u2192'],
  ['\u00E2\u20AC\u201D', '\u2014'],
  ['\u00E2\u20AC\u201C', '\u2013'],
  ['\u00C3\u00A9', '\u00E9'],
  ['\u00C3\u00AD', '\u00ED'],
  ['\u00C3\u00B3', '\u00F3'],
  ['\u00C3\u00BA', '\u00FA'],
  ['\u00C3\u00A1', '\u00E1'],
  ['\u00C3\u00B1', '\u00F1'],
  ['\u00C3\u2018', '\u00D1'],
  ['\u00C3\u0081', '\u00C1'],
  ['\u00C3\u0089', '\u00C9'],
  ['\u00C3\u201C', '\u00D3'],
  ['\u00C3\u00BC', '\u00FC'],
  ['\u00C3\u00B6', '\u00F6'],
  ['\u00C3\u00A3', '\u00E3'],
];

function fixContent(content) {
  let fixed = content.startsWith('\uFEFF') ? content.slice(1) : content;
  for (const [bad, good] of REPLACEMENTS) {
    fixed = fixed.split(bad).join(good);
  }
  return fixed;
}

function countChanges(original, fixed) {
  let count = 0;
  if (original.startsWith('\uFEFF') && !fixed.startsWith('\uFEFF')) count++;
  for (const [bad] of REPLACEMENTS) {
    let pos = 0;
    while ((pos = original.indexOf(bad, pos)) !== -1) { count++; pos++; }
  }
  return count;
}

function walk(dir, results = []) {
  const skip = ['node_modules', '.git', 'dist', 'coverage', '.claude'];
  for (const f of fs.readdirSync(dir)) {
    if (skip.includes(f)) continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, results);
    else if (/\.(tsx?|js|css|md)$/.test(f)) results.push(full);
  }
  return results;
}

const projectRoot = process.cwd();
const files = walk(projectRoot);

let totalChanges = 0;
let totalFilesFixed = 0;

for (const absPath of files) {
  const original = fs.readFileSync(absPath, 'utf8');
  const fixed = fixContent(original);
  if (fixed !== original) {
    const count = countChanges(original, fixed);
    fs.writeFileSync(absPath, fixed, 'utf8');
    const rel = absPath.replace(projectRoot, '').split('\\').join('/');
    console.log('[FIXED] ' + rel + '  (' + count + ' change' + (count !== 1 ? 's' : '') + ')');
    totalChanges += count;
    totalFilesFixed++;
  }
}

console.log('\nDone: ' + totalChanges + ' total changes across ' + totalFilesFixed + ' file(s).');
