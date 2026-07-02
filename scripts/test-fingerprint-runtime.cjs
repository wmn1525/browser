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

const { buildProfileDraft } = loadTsModule('src/renderer/src/components/profiles/profile-form-draft.ts');
const { normalizeProfileDraft } = loadTsModule('src/core/profile-dto-mapper.ts');
const { buildChromiumFingerprintPatchSource } = loadTsModule('src/core/chromium-fingerprint-runtime.ts');

const form = new FormData();
form.set('name', 'runtime profile');
form.set('userAgent', 'Mozilla/5.0 Runtime Test');
form.set('timezone', 'Asia/Shanghai');
form.set('language', 'zh-CN');
form.set('languages', 'zh-CN,zh,en-US');
form.set('platform', 'Win32');
form.set('cpu', '8');
form.set('memory', '16');
form.set('screenWidth', '1920');
form.set('screenHeight', '1080');
form.set('screenColorDepth', '24');
form.set('screenPixelDepth', '24');
form.set('webglVendor', 'Google Inc.');
form.set('webglRenderer', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)');
form.set('canvasMode', 'page');
form.set('audioMode', 'browser');
form.set('webglMode', 'global');
form.set('webgpuMode', 'disabled');
form.set('webrtcMode', 'disabled');
form.set('serviceWorkerMode', 'disabled');
form.set('clientHintsMode', 'value');
form.set('clientHintsPlatform', 'Windows');
form.set('clientHintsPlatformVersion', '10.0.0');
form.set('clientHintsArchitecture', 'x86');
form.set('clientHintsMobile', 'false');
form.set('clientHintsBrandVersion', '140');

const draft = buildProfileDraft(form, undefined);
assert.equal(draft.fingerprint.languages, 'zh-CN,zh,en-US');
assert.equal(draft.fingerprint.screenColorDepth, 24);
assert.equal(draft.fingerprint.audioMode, 'browser');
assert.equal(draft.fingerprint.webrtcMode, 'disabled');
assert.equal(draft.fingerprint.clientHintsPlatform, 'Windows');

const normalized = normalizeProfileDraft(draft);
assert.equal(normalized.fingerprint.userAgent, 'Mozilla/5.0 Runtime Test');
assert.deepEqual(normalized.fingerprint.screen, { width: 1920, height: 1080 });
assert.equal(normalized.fingerprint.webgl.renderer, 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)');
assert.equal(normalized.fingerprint.canvas, 'noise');
assert.equal(normalized.fingerprint.audio, 'noise');
assert.equal(normalized.fingerprint.webrtc, 'disable');

const source = buildChromiumFingerprintPatchSource(normalized);
assert.match(source, /navigator\.userAgentData/);
assert.match(source, /screen\.colorDepth/);
assert.match(source, /serviceWorker/);
assert.match(source, /gpu/);
assert.doesNotMatch(source, /slice\(0, 0\)/);

const zeroSaltSource = buildChromiumFingerprintPatchSource({
  fingerprint: {
    rectsMode: 'global',
    rectsValue: 'F'
  }
});
assert.match(zeroSaltSource, /"domRectSalt":0/);

console.log('fingerprint runtime tests passed');
