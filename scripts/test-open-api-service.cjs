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

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.key ? { 'X-API-Key': options.key } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined
  };
}

async function main() {
  const { LocalApiServer } = loadTsModule('src/main/local-api-server.ts');
  const calls = [];
  const server = new LocalApiServer({
    getSettings: async () => ({ enabled: true, apiKey: 'secret-key', port: 0 }),
    browser: {
      listProfiles: async () => [{ id: 'p1', name: 'One', isRunning: false, tags: [] }],
      getProfile: async (profileId) => ({ id: profileId, name: 'One', isRunning: false, tags: [], disabledGlobalExtensionIds: [], startUrls: [] }),
      createProfile: async (draft) => ({ id: draft.id ?? 'new-profile', name: draft.name, isRunning: false, tags: [] }),
      updateProfile: async (profileId, draft) => ({ id: profileId, name: draft.name, isRunning: false, tags: [] }),
      launchProfile: async (profileId) => ({ profileId, port: 9222, debugPort: 9222, debugUrl: 'http://127.0.0.1:9222', wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/test' }),
      closeProfile: async (profileId) => calls.push(`close:${profileId}`),
      deleteProfile: async (profileId) => calls.push(`delete:${profileId}`)
    },
    groups: {
      list: async () => [{ id: 'g1', name: 'Group One' }]
    },
    proxies: {
      list: async () => [{ id: 'proxy-1', protocol: 'http', host: '127.0.0.1', port: 8080, remark: '', profileCount: 0, tags: [], status: 'unchecked' }]
    },
    extensions: {
      list: async () => [{ id: 'e1', engine: 'chromium', name: 'Ext', enabled: true, exists: true, effectivePath: 'C:/ext' }],
      update: async (extensionId, update) => ({ id: extensionId, engine: 'chromium', name: 'Ext', enabled: update.enabled ?? true, exists: true, effectivePath: 'C:/ext' }),
      delete: async (extensionId) => calls.push(`extension:${extensionId}`)
    }
  });

  const info = await server.start();
  try {
    assert.equal(info.running, true);
    assert.ok(info.port > 0);

    assert.equal((await request(info.port, '/open-api/health')).status, 401);
    assert.deepEqual((await request(info.port, '/open-api/health', { key: 'secret-key' })).body, { status: 'ok' });
    assert.equal((await request(info.port, '/open-api/profiles', { key: 'bad' })).status, 401);

    const profiles = await request(info.port, '/open-api/profiles', { key: 'secret-key' });
    assert.equal(profiles.status, 200);
    assert.equal(profiles.body[0].id, 'p1');

    const created = await request(info.port, '/open-api/profiles', {
      key: 'secret-key',
      method: 'POST',
      body: { name: 'Created', startUrls: ['https://example.com'], tags: ['api'] }
    });
    assert.equal(created.body.id, 'new-profile');

    const launch = await request(info.port, '/open-api/profiles/p1/start', { key: 'secret-key', method: 'POST' });
    assert.equal(launch.body.port, 9222);
    assert.equal(launch.body.debug_url, 'http://127.0.0.1:9222');

    const updatedExtension = await request(info.port, '/open-api/extensions/e1', {
      key: 'secret-key',
      method: 'PUT',
      body: { enabled: false }
    });
    assert.equal(updatedExtension.body.enabled, false);

    await request(info.port, '/open-api/extensions/e1', { key: 'secret-key', method: 'DELETE' });
    assert.deepEqual(calls, ['extension:e1']);
  } finally {
    await server.stop();
  }
  console.log('open api service tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
