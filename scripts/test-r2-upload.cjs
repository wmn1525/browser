const assert = require('node:assert/strict');
const { execFileSync: realExecFileSync } = require('node:child_process');
const { mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { Module } = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'scripts', 'upload-r2-release-files.cjs');
const previousCwd = process.cwd();
const previousEnv = {
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_PREFIX: process.env.R2_PREFIX
};
const originalLoad = Module._load;

try {
  const arm64Keys = runUploadCase('mac-arm64', 'arm64');
  const x64Keys = runUploadCase('mac-x64', 'x64');

  assert.deepEqual(arm64Keys, [
    's3://test-bucket/publish/mac-arm64/ImRun Browser-0.3.0-arm64.dmg',
    's3://test-bucket/publish/mac-arm64/latest-mac.yml'
  ]);
  assert.deepEqual(x64Keys, [
    's3://test-bucket/publish/mac-x64/ImRun Browser-0.3.0-x64.dmg',
    's3://test-bucket/publish/mac-x64/latest-mac.yml'
  ]);

  console.log('R2 upload checks passed.');
} finally {
  Module._load = originalLoad;
  process.chdir(previousCwd);
  restoreEnv();
}

function runUploadCase(prefix, arch) {
  const tempRoot = path.join(tmpdir(), `imrun-r2-upload-${process.pid}-${arch}`);
  const calls = [];

  process.env.R2_BUCKET = 'test-bucket';
  process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
  process.env.R2_PREFIX = `publish/${prefix}`;

  mkdirSync(path.join(tempRoot, 'release'), { recursive: true });
  writeFileSync(path.join(tempRoot, 'release', `ImRun Browser-0.3.0-${arch}.dmg`), 'dmg');
  writeFileSync(path.join(tempRoot, 'release', `ImRun Browser-0.3.0-${arch}.zip`), 'zip');
  writeFileSync(path.join(tempRoot, 'release', 'latest-mac.yml'), 'latest');
  writeFileSync(path.join(tempRoot, 'release', 'builder-debug.yml'), 'debug');

  Module._load = function loadWithAwsMock(request, parent, isMain) {
    if (request === 'node:child_process') {
      return {
        execFileSync(command, args) {
          assert.equal(command, 'aws');
          assert.equal(args[0], 's3');
          assert.equal(args[1], 'cp');
          assert.equal(path.isAbsolute(args[2]), true, 'local upload path should be absolute.');
          calls.push({ args });
          return '';
        }
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    process.chdir(tempRoot);
    const testModule = new Module(`${scriptPath}-${arch}`, module);
    testModule.filename = scriptPath;
    testModule.paths = Module._nodeModulePaths(root);
    testModule._compile(readFileSync(scriptPath, 'utf8'), scriptPath);
    return calls.map((call) => call.args[3]);
  } finally {
    process.chdir(previousCwd);
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function restoreEnv() {
  for (const [name, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}
