const fs = require('fs');
const path = require('path');

const packages = new Set();
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules', '.next', '.git'].includes(f.name)) {
      walk(full);
    } else if (f.isFile() && (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js') || f.name.endsWith('.cjs'))) {
      const code = fs.readFileSync(full, 'utf8');
      const re = /(?:import\s+(?:[\s\S]*?from\s+)?|require\()\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(code))) {
        const pkg = m[1];
        if (!pkg.startsWith('.') && !pkg.startsWith('@/') && !pkg.startsWith('node:')) {
          const name = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
          packages.add(name);
        }
      }
    }
  }
}
walk('.');
console.log('Detected packages in code:', Array.from(packages).sort());
const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const declared = new Set([
  ...Object.keys(pkgJson.dependencies || {}),
  ...Object.keys(pkgJson.devDependencies || {}),
  'crypto', 'fs', 'path', 'os', 'child_process', 'util', 'stream', 'buffer', 'http', 'https', 'url', 'events', 'net', 'tls', 'assert'
]);
const missing = Array.from(packages).filter(p => !declared.has(p));
console.log('Missing from package.json:', missing);
