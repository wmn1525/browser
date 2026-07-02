const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

const root = join(__dirname, '..');
const sourcePath = join(root, 'src', 'core', 'profile-dto-mapper.ts');
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

const { normalizeProfileDraft, toProfileDetail, toProfileSummary } = testModule.exports;

const storedProfile = {
  id: 'legacy',
  name: 'Legacy',
  groupId: '未分组',
  proxy: undefined,
  tags: [],
  startUrls: []
};

assert.equal(toProfileSummary(storedProfile, false).groupId, undefined);
assert.equal(toProfileDetail(storedProfile, false).groupId, undefined);
assert.equal(normalizeProfileDraft({
  name: 'Legacy',
  groupId: '未分组',
  startUrls: [],
  tags: []
}).groupId, undefined);

console.log('profile group history tests passed');
