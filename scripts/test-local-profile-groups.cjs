const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

const root = join(__dirname, '..');
const sourcePath = join(root, 'src', 'renderer', 'src', 'components', 'profiles', 'profile-groups.ts');

assert.ok(existsSync(sourcePath), 'profile-groups.ts should exist');

const source = readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const testModule = new Module(sourcePath, module);
testModule.filename = sourcePath;
testModule.paths = Module._nodeModulePaths(root);
testModule._compile(output, sourcePath);

const {
  canDeleteGroup,
  countProfilesByGroup,
  createLocalGroup,
  filterProfilesByGroup,
  getGroupLabel
} = testModule.exports;

const groups = [
  createLocalGroup('  电商业务  '),
  createLocalGroup('广告投放')
];

assert.equal(groups[0].name, '电商业务');
assert.match(groups[0].id, /^group-[a-z0-9-]+$/);
assert.notEqual(groups[0].id, groups[1].id);

const profiles = [
  { id: 'p1', name: 'Amazon', groupId: groups[0].id, proxyLabel: 'Direct', timezoneLabel: 'System', tags: [], isRunning: false },
  { id: 'p2', name: 'TikTok', groupId: groups[1].id, proxyLabel: 'Direct', timezoneLabel: 'System', tags: [], isRunning: false },
  { id: 'p3', name: 'No group', proxyLabel: 'Direct', timezoneLabel: 'System', tags: [], isRunning: false }
];

assert.equal(getGroupLabel(groups, groups[0].id), '电商业务');
assert.equal(getGroupLabel(groups, undefined), '未分组');
assert.equal(getGroupLabel(groups, 'missing-group'), 'missing-group');

assert.deepEqual(countProfilesByGroup(groups, profiles), [
  { group: groups[0], count: 1 },
  { group: groups[1], count: 1 }
]);

assert.deepEqual(filterProfilesByGroup(profiles, 'all').map((profile) => profile.id), ['p1', 'p2', 'p3']);
assert.deepEqual(filterProfilesByGroup(profiles, 'ungrouped').map((profile) => profile.id), ['p3']);
assert.deepEqual(filterProfilesByGroup(profiles, groups[1].id).map((profile) => profile.id), ['p2']);

assert.equal(canDeleteGroup(groups[0].id, profiles), false);
assert.equal(canDeleteGroup('empty-group', profiles), true);

console.log('local profile group tests passed');
