const assert = require('node:assert/strict');
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { Module } = require('node:module');
const AdmZip = require('adm-zip');
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

function writeZip(zipPath, entries) {
  const zip = new AdmZip();
  for (const entry of entries) {
    zip.addFile(entry.name, Buffer.from(entry.text, 'utf8'));
  }
  zip.writeZip(zipPath);
}

const workDir = join(tmpdir(), `imrun-ext-service-${Date.now()}`);
const sourceDir = join(workDir, 'source');
const storageDir = join(workDir, 'extensions');
mkdirSync(sourceDir, { recursive: true });

try {
  const manager = loadTsModule('src/core/extension-manager.ts');
  const manifest = JSON.stringify({ manifest_version: 3, name: 'Demo', version: '1.0.0' });
  const chromeZip = join(sourceDir, 'demo.zip');
  writeZip(chromeZip, [{ name: 'nested/manifest.json', text: manifest }]);

  const uploadedChrome = manager.persistUploadedExtension({
    rootDir: storageDir,
    engine: 'chromium',
    extensionId: 'chrome-one',
    sourcePath: chromeZip,
    displayName: 'Demo Chrome'
  });
  assert.equal(uploadedChrome.fileName, 'demo.zip');
  assert.equal(uploadedChrome.effectivePath.endsWith(join('unpacked', 'nested')), true);
  assert.equal(existsSync(join(uploadedChrome.effectivePath, 'manifest.json')), true);

  const crxRaw = Buffer.concat([Buffer.from('Cr24 fake header'), readFileSync(chromeZip)]);
  const crxPayload = manager.extractZipPayloadFromCrx(crxRaw);
  assert.equal(crxPayload.slice(0, 4).toString('binary'), 'PK\u0003\u0004');

  const maliciousZip = join(sourceDir, 'bad.zip');
  writeZip(maliciousZip, [{ name: '../escape.txt', text: 'nope' }]);
  assert.throws(() => manager.persistUploadedExtension({
    rootDir: storageDir,
    engine: 'chromium',
    extensionId: 'bad-one',
    sourcePath: maliciousZip,
    displayName: 'Bad'
  }), /路径非法/);

  const firefoxFolder = join(sourceDir, 'firefox-addon');
  mkdirSync(firefoxFolder, { recursive: true });
  writeFileSync(join(firefoxFolder, 'manifest.json'), JSON.stringify({
    manifest_version: 2,
    name: 'Firefox Demo',
    version: '1.0.0',
    browser_specific_settings: { gecko: { id: 'demo@example.com' } }
  }), 'utf8');
  const importedFirefox = manager.persistExtensionFolder({
    rootDir: storageDir,
    engine: 'firefox',
    extensionId: 'firefox-one',
    folderPath: firefoxFolder,
    displayName: ''
  });
  assert.equal(importedFirefox.fileName, 'firefox-addon');
  assert.equal(importedFirefox.storedPath.endsWith('.xpi'), true);
  assert.equal(existsSync(importedFirefox.storedPath), true);
  assert.equal(manager.getFirefoxExtensionTargetName(importedFirefox.storedPath), 'demo@example.com.xpi');

  manager.removeExtensionStorage(storageDir, 'firefox', 'firefox-one');
  assert.equal(existsSync(join(storageDir, 'firefox', 'firefox-one')), false);
  console.log('managed extension service tests passed');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
