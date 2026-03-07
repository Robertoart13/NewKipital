const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const projectRoot = 'C:/Users/RobertoCarlosZuñigaA/Documents/ROCCA ARCHIVOS/Desarrollo/PROYECTOS DESAROLLOS/KPITAL 360/NewKipital';

let iterations = 0;
while (iterations < 50) {
  iterations++;
  let out;
  try {
    out = execSync('node node_modules/vite/bin/vite.js build 2>&1', { encoding: 'utf8', cwd: projectRoot + '/frontend', shell: true });
  } catch(e) { out = (e.stdout||'') + (e.stderr||''); }
  
  if (!out.includes('ERROR:')) {
    console.log('Build successful after', iterations, 'iteration(s)!');
    break;
  }
  
  const errMatch = out.match(/C:[^\n]+\.tsx?:\d+:\d+: ERROR:/);
  if (!errMatch) { console.log('Cannot parse error location'); break; }
  
  const loc = errMatch[0].replace(': ERROR:','');
  const parts = loc.split(':');
  const filePath = parts.slice(0,-2).join(':');
  const lineNum = parseInt(parts[parts.length-2]) - 1;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const line = lines[lineNum];
  
  console.log('Fixing [' + path.basename(filePath) + ':' + (lineNum+1) + ']: ' + line.trim().slice(0,90));
  
  const fixed = line.replace(/([\w\])'"`])\s\?(?!\?|[.[])\s/g, '$1 ?? ');
  
  if (fixed === line) {
    console.log('Could not auto-fix this line. Manual check needed.');
    break;
  }
  
  lines[lineNum] = fixed;
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('  Fixed: ' + fixed.trim().slice(0,90));
}
