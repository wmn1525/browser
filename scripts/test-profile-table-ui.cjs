const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stylesPath = path.join(root, 'src', 'renderer', 'src', 'styles.css');
const tablePath = path.join(root, 'src', 'renderer', 'src', 'components', 'profiles', 'profile-table.tsx');
const formPath = path.join(root, 'src', 'renderer', 'src', 'components', 'profiles', 'profile-form-fields.tsx');
const filterbarPath = path.join(root, 'src', 'renderer', 'src', 'components', 'profiles', 'filterbar.tsx');

const styles = fs.readFileSync(stylesPath, 'utf8');
const table = fs.readFileSync(tablePath, 'utf8');
const form = fs.readFileSync(formPath, 'utf8');
const filterbar = fs.readFileSync(filterbarPath, 'utf8');
const failures = [];

if (!/\/\*\s*\n\s*\* 全局滚动条\s*\n\s*\*\//.test(styles)) {
  failures.push('styles.css must include the global scrollbar comment.');
}

if (!/::-webkit-scrollbar\s*\{[\s\S]*width:\s*7px;[\s\S]*height:\s*11px;/.test(styles)) {
  failures.push('Global scrollbar must use width 7px and height 11px.');
}

if (!/::-webkit-scrollbar-thumb\s*\{[\s\S]*background-color:\s*hsl\(var\(--primary\) \/ 0\.2\);[\s\S]*border-radius:\s*10px;/.test(styles)) {
  failures.push('Global scrollbar thumb must use primary alpha background and 10px radius.');
}

if (!/html\.dark ::-webkit-scrollbar,[\s\S]*html\.dark ::-webkit-scrollbar-track\s*\{[\s\S]*background-color:\s*#212529;/.test(styles)) {
  failures.push('Dark scrollbar track must use #212529.');
}

if (!/html\.dark ::-webkit-scrollbar-thumb\s*\{[\s\S]*background-color:\s*#343a40;/.test(styles)) {
  failures.push('Dark scrollbar thumb must use #343a40.');
}

if (!/label="名称"\s+maxLength=\{30\}/.test(form)) {
  failures.push('Profile name field must allow 30 characters.');
}

const nameHeaderIndex = table.indexOf('<Th>名称</Th>');
const groupHeaderIndex = table.indexOf('<Th>分组名称</Th>');
const proxyHeaderIndex = table.indexOf('<Th>代理IP</Th>');
if (nameHeaderIndex === -1 || groupHeaderIndex === -1 || proxyHeaderIndex === -1 || groupHeaderIndex > proxyHeaderIndex) {
  failures.push('Profile table must show 代理IP after 分组名称.');
}

const nameCellIndex = table.indexOf('profile.name ||');
const proxyCellIndex = table.indexOf('formatProxyAddress(profile.proxyLabel)');
if (nameCellIndex === -1 || proxyCellIndex === -1 || nameCellIndex > proxyCellIndex) {
  failures.push('Profile table row cells must show name before proxy IP.');
}

if (table.includes('<Th>编号</Th>') || table.includes('<Td>{profile.id}</Td>')) {
  failures.push('Profile table must not show the 编号 column.');
}

if (!/sticky right-0/.test(table)) {
  failures.push('Profile action column must be fixed to the right.');
}

const actionbar = filterbar.match(/<div className="ml-auto flex gap-2">([\s\S]*?)<\/div>/)?.[1] ?? '';
const actionButtonTitles = [...actionbar.matchAll(/title="([^"]+)"/g)].map((match) => match[1]);
if (JSON.stringify(actionButtonTitles) !== JSON.stringify(['刷新'])) {
  failures.push('Profile filterbar action row must only keep the refresh button.');
}

if (/\b(?:Bookmark|Settings|Trash2|X)\b/.test(filterbar)) {
  failures.push('Profile filterbar must not render delete, favorite, settings, or clear icons.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Profile table UI checks passed.');
