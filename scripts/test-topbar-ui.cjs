const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const topbarPath = path.join(root, 'src', 'renderer', 'src', 'components', 'layout', 'topbar.tsx');
const topbar = fs.readFileSync(topbarPath, 'utf8');
const failures = [];

if (/\bBell\b/.test(topbar)) {
  failures.push('Topbar must not import or render the notification bell icon.');
}

if (/title="通知"|暂无新通知/.test(topbar)) {
  failures.push('Topbar must not render the notification button.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Topbar UI checks passed.');
