const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { Module } = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'scripts', 'prune-r2-releases.cjs');
const calls = [];
const payloads = [];
const previousEnv = {
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_KEEP_RELEASES: process.env.R2_KEEP_RELEASES,
  R2_PREFIX: process.env.R2_PREFIX
};
const originalLoad = Module._load;

process.env.R2_BUCKET = 'test-bucket';
process.env.R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
process.env.R2_KEEP_RELEASES = '1';
process.env.R2_PREFIX = 'publish';

Module._load = function loadWithAwsMock(request, parent, isMain) {
  if (request === 'node:child_process') {
    return { execFileSync: fakeAwsExecFileSync };
  }

  return originalLoad.call(this, request, parent, isMain);
};

try {
  const testModule = new Module(scriptPath, module);
  testModule.filename = scriptPath;
  testModule.paths = Module._nodeModulePaths(root);
  testModule._compile(readFileSync(scriptPath, 'utf8'), scriptPath);

  const deleteCall = calls.find((call) => call.args.includes('delete-objects'));
  assert.ok(deleteCall, 'R2 cleanup should call delete-objects.');

  const deleteArg = deleteCall.args[deleteCall.args.indexOf('--delete') + 1];
  assert.match(deleteArg, /^file:\/\//, 'delete-objects payload must use file:// to avoid long command lines.');
  assert.equal(payloads.length, 1, 'R2 cleanup should write one delete payload file.');
  assert.deepEqual(payloads[0].Objects, [
    { Key: 'publish/ImRun Browser-0.1.0-arm64.zip' },
    { Key: 'publish/mac-arm64/ImRun Browser-0.1.0-arm64.dmg' },
    { Key: 'publish/mac-arm64/ImRun Browser.app/Contents/Frameworks/Electron Framework.framework/Resources/zh_CN.lproj/locale.pak' },
    { Key: 'publish/win-unpacked/ImRun Browser.exe' }
  ]);

  console.log('R2 prune checks passed.');
} finally {
  Module._load = originalLoad;
  restoreEnv();
}

function fakeAwsExecFileSync(command, args) {
  assert.equal(command, 'aws');
  calls.push({ args });

  if (args[0] === 's3api' && args[1] === 'list-objects-v2') {
    return JSON.stringify({
      Contents: [
        { Key: 'publish/ImRun Browser-0.2.0-arm64.zip' },
        { Key: 'publish/ImRun Browser-0.1.0-arm64.zip' },
        { Key: 'publish/mac-arm64/ImRun Browser-0.2.0-arm64.dmg' },
        { Key: 'publish/mac-arm64/latest-mac.yml' },
        { Key: 'publish/mac-arm64/ImRun Browser-0.1.0-arm64.dmg' },
        { Key: 'publish/mac-arm64/ImRun Browser.app/Contents/Frameworks/Electron Framework.framework/Resources/zh_CN.lproj/locale.pak' },
        { Key: 'publish/win-unpacked/ImRun Browser.exe' }
      ]
    });
  }

  if (args[0] === 's3api' && args[1] === 'delete-objects') {
    const deleteArg = args[args.indexOf('--delete') + 1];
    if (deleteArg.startsWith('file://')) {
      const payloadPath = path.resolve(root, deleteArg.slice('file://'.length));
      assert.equal(existsSync(payloadPath), true, 'delete payload file should exist during aws call.');
      payloads.push(JSON.parse(readFileSync(payloadPath, 'utf8')));
    }
    return '';
  }

  throw new Error(`Unexpected aws command: ${args.join(' ')}`);
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
