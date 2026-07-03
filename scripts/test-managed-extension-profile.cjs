const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

const root = join(__dirname, '..');

require.extensions['.ts'] = (testModule, sourcePath) => {
  const source = readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  testModule._compile(output, sourcePath);
};

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

const browserEngine = loadTsModule('src/core/browser-engine.ts');
assert.deepEqual(browserEngine.getEnabledExtensionPaths([
  { id: 'a', engine: 'chromium', enabled: true, exists: true, effectivePath: 'C:/ext/a' },
  { id: 'b', engine: 'chromium', enabled: true, exists: true, effectivePath: 'C:/ext/b' },
  { id: 'c', engine: 'firefox', enabled: true, exists: true, effectivePath: 'C:/ext/c.xpi' },
  { id: 'd', engine: 'chromium', enabled: false, exists: true, effectivePath: 'C:/ext/d' },
  { id: 'e', engine: 'chromium', enabled: true, exists: false, effectivePath: 'C:/ext/e' }
], 'chromium', ['b']), ['C:/ext/a']);

console.log('managed extension profile tests passed');
