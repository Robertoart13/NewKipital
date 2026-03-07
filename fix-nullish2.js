const fs = require('fs');
const path = require('path');

function walk(dir, res=[]) {
  const skip=['node_modules','.git','dist','coverage','.claude'];
  for(const f of fs.readdirSync(dir)){
    if(skip.includes(f)) continue;
    const full=path.join(dir,f);
    if(fs.statSync(full).isDirectory()) walk(full,res);
    else if(/\.(tsx?|js)$/.test(f) && !f.includes('.test.') && !f.includes('.spec.')) res.push(full);
  }
  return res;
}

const root = process.cwd();
let totalFixed = 0;
let filesFixed = 0;

for (const absPath of walk(path.join(root,'frontend/src'))) {
  const content = fs.readFileSync(absPath,'utf8');
  const lines = content.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines that already have ?? or don't have ?
    if (!line.includes('?') || line.includes('??')) continue;
    
    // Pattern: something ? SAFE_DEFAULT where SAFE_DEFAULT is:
    // '', "", 0, null, undefined, [], {}, `...`
    // AND the line doesn't have a colon after the ? that would make it a ternary
    
    // Replace: value ? '' -> value ?? ''  (empty string)
    // Replace: value ? [] -> value ?? []  (empty array)  
    // Replace: value ? 0  -> value ?? 0   (zero)
    // Replace: value ? null -> value ?? null
    // Replace: value ? `...` -> value ?? `...` (backtick template)
    
    const fixed = line
      // ? '' or ? "" at end of expression (before ; ) , ])
      .replace(/([\w\])'"`])\s\?(?!\?|\.)\s(''|""|0|null|undefined|\[\]|\{\})/g, '$1 ?? $2')
      // ? `template literal` — more complex, just handle the opening backtick
      .replace(/([\w\])'"`])\s\?(?!\?|\.)\s`/g, '$1 ?? `');
    
    if (fixed !== line) {
      lines[i] = fixed;
      changed = true;
      totalFixed++;
    }
  }

  if (changed) {
    fs.writeFileSync(absPath, lines.join('\n'), 'utf8');
    filesFixed++;
  }
}

console.log('Fixed ' + totalFixed + ' lines in ' + filesFixed + ' files.');
