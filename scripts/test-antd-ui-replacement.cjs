const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rendererRoot = path.join(root, 'src', 'renderer', 'src');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const forbiddenPackages = [
  '@radix-ui/react-checkbox',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-label',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-tooltip',
  'class-variance-authority',
  'tailwind-merge'
];
const forbiddenImportPatterns = [
  /components\/ui/,
  /\.\.\/ui\//,
  /\.\/components\/ui\//,
  /@radix-ui/,
  /class-variance-authority/,
  /tailwind-merge/
];
const allowedExtensions = new Set(['.ts', '.tsx', '.css']);
const failures = [];

function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return allowedExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

if (!packageJson.dependencies?.antd) {
  failures.push('package.json must include antd in dependencies.');
}

for (const packageName of forbiddenPackages) {
  if (packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]) {
    failures.push(`package.json must not include ${packageName}.`);
  }
}

for (const filePath of walkFiles(rendererRoot)) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const pattern of forbiddenImportPatterns) {
    if (pattern.test(text)) {
      failures.push(`${path.relative(root, filePath)} contains forbidden UI reference: ${pattern}`);
    }
  }
}

const oldUiPath = path.join(rendererRoot, 'components', 'ui');
if (fs.existsSync(oldUiPath)) {
  failures.push('src/renderer/src/components/ui must be removed.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Antd UI replacement checks passed.');
