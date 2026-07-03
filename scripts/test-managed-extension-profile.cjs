const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

const root = join(__dirname, '..');

function loadTsModule(relativePath) {
  const sourcePath = join(root, relativePath);
  assert.ok(existsSync(sourcePath), `${relativePath} should exist`);
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
  return testModule.exports;
}

const mapper = loadTsModule('src/core/profile-dto-mapper.ts');

const normalized = mapper.normalizeProfileDraft({
  name: 'extension profile',
  disabledGlobalExtensionIds: ['ext-a', 'ext-b'],
  startUrls: [],
  tags: []
});
assert.deepEqual(normalized.disabledGlobalExtensionIds, ['ext-a', 'ext-b']);

const detail = mapper.toProfileDetail({
  id: 'profile-1',
  name: 'Profile One',
  proxy: undefined,
  tags: [],
  startUrls: [],
  disabledGlobalExtensionIds: ['ext-a']
}, false);
assert.deepEqual(detail.disabledGlobalExtensionIds, ['ext-a']);

console.log('managed extension profile tests passed');
