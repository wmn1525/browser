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

function createOptions() {
  return {
    syncNavigation: true,
    syncClick: true,
    syncInput: true,
    syncScroll: true,
    syncKeyboard: true,
    syncMouseMove: true,
    syncCurrentUrlOnStart: true
  };
}

function createClickEvent() {
  return {
    type: 'click',
    href: 'https://example.com/',
    payload: {
      selector: '#submit',
      x: 10,
      y: 20,
      rx: 0.1,
      ry: 0.2,
      button: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false
    },
    ts: 100
  };
}

function createFakeConnector() {
  let masterListener;
  const followerClients = [];
  const closedClients = [];

  return {
    followerClients,
    closedClients,
    emit(event) {
      assert.ok(masterListener, 'master listener should be registered');
      masterListener(event);
    },
    async connectMaster(profile, onEvent) {
      masterListener = onEvent;
      return {
        profileId: profile.id,
        async apply() {},
        async getCurrentUrl() {
          return 'https://start.example/';
        },
        async close() {
          closedClients.push(profile.id);
        }
      };
    },
    async connectFollower(profile) {
      const client = {
        profileId: profile.id,
        events: [],
        async apply(event) {
          this.events.push(event);
        },
        async close() {
          closedClients.push(profile.id);
        }
      };
      followerClients.push(client);
      return client;
    }
  };
}

async function main() {
  const { WindowSyncService } = loadTsModule('src/main/window-sync-service.ts');
  const connector = createFakeConnector();
  const service = new WindowSyncService({
    listProfiles: async () => [
      { id: 'p1', name: 'Master', isRunning: true, syncSupported: true, debugPort: 9222, debugUrl: 'http://127.0.0.1:9222' },
      { id: 'p2', name: 'Follower', isRunning: true, syncSupported: true, debugPort: 9223, debugUrl: 'http://127.0.0.1:9223' },
      { id: 'p3', name: 'Firefox', isRunning: true, syncSupported: false }
    ],
    connector
  });

  const profiles = await service.listProfiles();
  assert.equal(profiles.length, 3);
  assert.equal(profiles[0].syncSupported, true);

  const started = await service.start({
    masterProfileId: 'p1',
    followerProfileIds: ['p2'],
    options: createOptions()
  });
  assert.equal(started.running, true);
  assert.equal(started.masterProfileId, 'p1');
  assert.equal(started.connectedFollowers, 1);
  assert.equal(connector.followerClients[0].events.length, 1);
  assert.equal(connector.followerClients[0].events[0].type, 'navigate');

  connector.emit(createClickEvent());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(connector.followerClients[0].events.length, 2);
  assert.equal(connector.followerClients[0].events[1].type, 'click');

  const stopped = await service.stop();
  assert.equal(stopped.running, false);
  assert.deepEqual(connector.closedClients.sort(), ['p1', 'p2']);

  await assert.rejects(
    () => service.start({ masterProfileId: 'p3', followerProfileIds: ['p2'], options: createOptions() }),
    /不支持窗口同步/
  );

  console.log('window sync service tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
