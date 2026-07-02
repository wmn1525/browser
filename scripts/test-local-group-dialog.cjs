const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const appSource = readFileSync(join(__dirname, '..', 'src', 'renderer', 'src', 'App.tsx'), 'utf8');
const groupPageSource = readFileSync(join(__dirname, '..', 'src', 'renderer', 'src', 'components', 'feature', 'local-groups-page.tsx'), 'utf8');

assert.equal(appSource.includes("window.prompt('请输入新分组名称')"), false, 'create group should not use native prompt');
assert.equal(appSource.includes("window.prompt('请输入新的分组名称'"), false, 'rename group should not use native prompt');
assert.equal(groupPageSource.includes('GroupNameDialog'), true, 'local group page should render an in-app name dialog');

console.log('local group dialog tests passed');
