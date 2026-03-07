const fs = require('fs');
const path = require('path');

function walk(dir) {
  let r = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) r = r.concat(walk(p));
      else if (f.endsWith('.tsx') || f.endsWith('.ts')) r.push(p);
    }
  } catch(e) {}
  return r;
}

const searchDirs = [
  'frontend/src/pages/private/personal-actions',
  'frontend/src/pages/private/payroll-management',
  'frontend/src/pages/private/employees',
  'frontend/src/pages/private/configuration',
  'frontend/src/pages/private/monitoring',
];

let total = 0;
for (const d of searchDirs) {
  for (const f of walk(d)) {
    const c = fs.readFileSync(f, 'utf8');
    const badQ = (c.match(/[a-zA-Z]\?[a-zA-Z]/g) || []).length;
    const badC3 = [...c].filter(x => {
      const cp = x.codePointAt(0);
      return cp === 0xC3 || cp === 0xC2 || cp === 0xE2;
    }).length;
    if (badQ > 0 || badC3 > 0) {
      const rel = f.split('NewKipital')[1] || f;
      console.log(rel.split('\\').join('/') + '  ?-patterns=' + badQ + '  bad-codepoints=' + badC3);
      total++;
    }
  }
}
console.log('\nTotal files with issues:', total);
