const assert = require('node:assert/strict');
const { existsSync, mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');

const root = join(__dirname, '..');

function readProjectFile(relativePath) {
  const absolutePath = join(root, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} should exist`);
  return readFileSync(absolutePath, 'utf8');
}

function loadTsModule(relativePath) {
  const sourcePath = join(root, relativePath);
  const source = readProjectFile(relativePath);
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

function createFakeApp(appDataPath, userDataPath) {
  let currentUserDataPath = userDataPath;
  const setPaths = new Map();
  return {
    app: {
      isPackaged: false,
      getName: () => 'ImRunTest',
      getPath: (name) => {
        if (name === 'appData') return appDataPath;
        if (name === 'userData') return currentUserDataPath;
        throw new Error(`unexpected path request: ${name}`);
      },
      setPath: (name, value) => {
        setPaths.set(name, value);
        if (name === 'userData') currentUserDataPath = value;
      }
    },
    setPaths
  };
}

async function testSettingsStore() {
  const { AppSettingsStore, configureAppDataDirectory } = loadTsModule('src/main/app-settings-store.ts');
  const tempRoot = mkdtempSync(join(tmpdir(), 'imrun-settings-'));
  try {
    const defaultPath = join(tempRoot, 'ImRunTest-dev');
    let currentPath = defaultPath;
    const store = new AppSettingsStore({
      appDataPath: tempRoot,
      appName: 'ImRunTest',
      defaultDataPath: defaultPath,
      getCurrentDataPath: () => currentPath
    });

    let info = await store.getDataDirectoryInfo();
    assert.equal(info.currentPath, resolve(defaultPath));
    assert.equal(info.defaultPath, resolve(defaultPath));
    assert.equal(info.nextStartPath, resolve(defaultPath));
    assert.equal(info.restartRequired, false);

    const migratedPath = join(tempRoot, 'manual-migrated-data');
    info = await store.setDataDirectory(migratedPath);
    assert.equal(info.currentPath, resolve(defaultPath));
    assert.equal(info.configuredPath, resolve(migratedPath));
    assert.equal(info.nextStartPath, resolve(migratedPath));
    assert.equal(info.restartRequired, true);
    assert.equal(existsSync(migratedPath), true);

    currentPath = migratedPath;
    info = await store.getDataDirectoryInfo();
    assert.equal(info.restartRequired, false);

    info = await store.resetDataDirectory();
    assert.equal(info.nextStartPath, resolve(defaultPath));
    assert.equal(info.restartRequired, true);

    await store.setDataDirectory(migratedPath);
    const fake = createFakeApp(tempRoot, defaultPath);
    await configureAppDataDirectory(fake.app);
    assert.equal(fake.setPaths.get('userData'), resolve(migratedPath));
    assert.equal(fake.setPaths.get('sessionData'), resolve(migratedPath));
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

async function main() {
  await testSettingsStore();

  const sidebar = readProjectFile('src/renderer/src/components/layout/sidebar.tsx');
  const featurePage = readProjectFile('src/renderer/src/components/feature/feature-page.tsx');
  const settingsPage = readProjectFile('src/renderer/src/components/feature/settings-center-page.tsx');
  const sharedTypes = readProjectFile('src/shared/types.ts');
  const preload = readProjectFile('src/preload/preload.ts');
  const ipc = readProjectFile('src/main/ipc.ts');
  const mainProcess = readProjectFile('src/main/main.ts');

  assert.match(sidebar, /settings/);
  assert.match(sidebar, /Settings/);
  assert.match(featurePage, /SettingsCenterPage/);
  assert.match(featurePage, /config\.key === 'settings'/);
  assert.match(sharedTypes, /AppDataDirectoryInfo/);
  assert.match(sharedTypes, /getAppDataDirectoryInfo/);
  assert.match(sharedTypes, /chooseAppDataDirectory/);
  assert.match(sharedTypes, /resetAppDataDirectory/);
  assert.match(sharedTypes, /openAppDataDirectory/);
  assert.match(preload, /app-settings:data-directory/);
  assert.match(preload, /app-settings:choose-data-directory/);
  assert.match(preload, /app-settings:reset-data-directory/);
  assert.match(preload, /app-settings:open-data-directory/);
  assert.match(ipc, /app-settings:data-directory/);
  assert.match(ipc, /shell\.openPath/);
  assert.match(ipc, /openDirectory/);
  assert.match(settingsPage, /getAppDataDirectoryInfo/);
  assert.match(settingsPage, /chooseAppDataDirectory/);
  assert.match(settingsPage, /openAppDataDirectory/);
  assert.match(settingsPage, /resetAppDataDirectory/);
  assert.match(settingsPage, /restartRequired/);
  assert.match(mainProcess, /configureAppDataDirectory/);
  assert.match(mainProcess, /import\('\.\/browser-services'\)/);
  assert.doesNotMatch(mainProcess, /import \{ localApiServer \} from '\.\/browser-services'/);

  console.log('settings center checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
