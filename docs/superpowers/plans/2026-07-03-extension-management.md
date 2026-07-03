# Extension Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在应用中心实现本地扩展管理闭环，让 Chromium 与 Firefox profile 启动时自动挂载已启用扩展，并允许单个 profile 禁用指定全局扩展。

**Architecture:** 扩展元数据保存在 Electron `userData`，扩展包处理放在 `core` 层纯工具中，主进程通过 IPC 负责文件选择与持久化。`BrowserEngine` 只依赖一个窄的扩展读取接口，不直接依赖 Electron；renderer 使用真实应用中心页面和 profile 表单字段消费 preload API。

**Tech Stack:** Electron 31、React 18、TypeScript 5、Ant Design、Node.js `fs/path`、`adm-zip`、`@aitofy/browser-profiles`。

---

## File Structure

- Modify: `package.json` and `package-lock.json`，新增 `adm-zip` 与 `@types/adm-zip`，用于安全读取、解包和打包扩展 ZIP/XPI。
- Modify: `src/shared/types.ts`，新增扩展管理 DTO、扩展更新 DTO、`ProfileDraft` 与 `ProfileDetail` 的禁用扩展字段，以及 preload API 声明。
- Modify: `src/core/profile-dto-mapper.ts`，把 `disabledGlobalExtensionIds` 写入和读出 profile。
- Create: `src/core/extension-manager.ts`，负责扩展包解析、文件夹导入、CRX payload 提取、安全解压、Firefox XPI 命名和目录删除。
- Modify: `src/core/browser-engine.ts`，构造时接收扩展读取接口，启动 Chromium 时传入 `extensions`，启动 Firefox 时传入 XPI 列表。
- Modify: `src/core/firefox-profile-launcher.ts`，启动前复制 XPI 到 profile 的 `extensions` 目录并写入必要 prefs。
- Create: `src/main/managed-extension-store.ts`，保存扩展元数据列表到 `managed-extensions.json`。
- Modify: `src/main/ipc.ts`，注册扩展导入、列表、更新、删除 IPC，并将 store 注入 `BrowserEngine`。
- Modify: `src/preload/preload.ts`，暴露扩展管理 API。
- Create: `src/renderer/src/components/feature/managed-extensions-page.tsx`，实现应用中心扩展管理页。
- Modify: `src/renderer/src/components/feature/feature-page.tsx`，将 `apps` 路由到真实扩展管理页。
- Modify: `src/renderer/src/components/profiles/browser-kernel-options.ts`，导出内核到引擎的解析函数。
- Modify: `src/renderer/src/components/profiles/profile-form-page.tsx`，把当前内核传给应用配置页签。
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`，在 `AppsTab` 中展示可禁用的全局扩展。
- Modify: `src/renderer/src/components/profiles/profile-form-draft.ts`，收集 `disabledGlobalExtensionIds`。
- Create: `scripts/test-managed-extension-service.cjs`，覆盖扩展包处理和 Firefox XPI 命名。
- Create: `scripts/test-managed-extension-profile.cjs`，覆盖 DTO 映射和 Chromium 扩展路径选择。
- Create: `scripts/test-managed-extension-ui.cjs`，覆盖 renderer 入口和表单字段存在性。
- Modify: `package.json`，新增 `test:managed-extensions` 脚本。

---

### Task 1: Add Failing Extension Service Tests

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/test-managed-extension-service.cjs`

- [ ] **Step 1: Install archive dependency**

Run:

```powershell
npm install adm-zip@^0.5.16
npm install -D @types/adm-zip@^0.5.7
```

Expected: `package.json` contains `adm-zip` in `dependencies` and `@types/adm-zip` in `devDependencies`.

- [ ] **Step 2: Write the failing service test**

Create `scripts/test-managed-extension-service.cjs`:

```js
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
```

- [ ] **Step 3: Run the failing test**

Run:

```powershell
node scripts/test-managed-extension-service.cjs
```

Expected: FAIL with `src/core/extension-manager.ts should exist`.

- [ ] **Step 4: Add npm script**

In `package.json`, add:

```json
"test:managed-extensions": "node scripts/test-managed-extension-service.cjs && node scripts/test-managed-extension-profile.cjs && node scripts/test-managed-extension-ui.cjs"
```

Expected: running `npm run test:managed-extensions` still fails because only the first test file exists and the implementation is absent.

- [ ] **Step 5: Commit failing service test**

Run:

```powershell
git add package.json package-lock.json scripts/test-managed-extension-service.cjs
git commit -m "test: add managed extension service coverage"
```

Expected: commit succeeds and includes only the dependency setup, package script, and first failing test.

---

### Task 2: Add Shared DTOs and Profile Mapping

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/core/profile-dto-mapper.ts`
- Create: `scripts/test-managed-extension-profile.cjs`

- [ ] **Step 1: Write the failing profile test**

Create `scripts/test-managed-extension-profile.cjs`:

```js
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
```

- [ ] **Step 2: Run the failing profile test**

Run:

```powershell
node scripts/test-managed-extension-profile.cjs
```

Expected: FAIL because `disabledGlobalExtensionIds` is not mapped yet.

- [ ] **Step 3: Add shared extension DTOs**

In `src/shared/types.ts`, add these types near browser kernel and profile DTOs:

```ts
/** 应用中心托管扩展使用浏览器内核引擎作为唯一分流维度。 */
export type ManagedExtensionEngine = BrowserKernelEngine;

/** 扩展来源影响存储方式，启动挂载只依赖 effectivePath。 */
export type ManagedExtensionSource = 'package' | 'folder';

/** 应用中心扩展元数据，文件本体保存在 Electron userData 的 extensions 目录中。 */
export interface ManagedExtension {
  readonly id: string;
  readonly engine: ManagedExtensionEngine;
  readonly name: string;
  readonly source: ManagedExtensionSource;
  readonly fileName: string;
  readonly storedPath: string;
  readonly unpackedPath?: string;
  readonly effectivePath: string;
  readonly enabled: boolean;
  readonly exists: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** 扩展列表只允许改显示名和启用状态，避免 renderer 改写文件路径。 */
export interface ManagedExtensionUpdate {
  readonly name?: string;
  readonly enabled?: boolean;
}
```

Add `disabledGlobalExtensionIds` to `ProfileDraft` and `ProfileDetail`:

```ts
readonly disabledGlobalExtensionIds: readonly string[];
```

Extend `BrowserShellApi` later in Task 5 with the extension methods, so this task only focuses on profile DTO and mapping.

- [ ] **Step 4: Map profile disabled extension ids**

In `src/core/profile-dto-mapper.ts`, extend `ExtendedProfileConfig` and `ExtendedStoredProfile`:

```ts
readonly disabledGlobalExtensionIds?: readonly string[];
```

In `normalizeProfileDraft`, add:

```ts
disabledGlobalExtensionIds: normalizeIds(draft.disabledGlobalExtensionIds),
```

In `toProfileDetail`, add:

```ts
disabledGlobalExtensionIds: normalizeIds(extendedProfile.disabledGlobalExtensionIds),
```

At the bottom of the file, add:

```ts
/** 清理扩展 id 列表，避免把空字符串保存进 profile 配置。 */
function normalizeIds(values: readonly string[] | undefined): readonly string[] {
  return Array.from(new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []));
}
```

- [ ] **Step 5: Run focused profile test**

Run:

```powershell
node scripts/test-managed-extension-profile.cjs
```

Expected: PASS with `managed extension profile tests passed`.

- [ ] **Step 6: Commit DTO mapping**

Run:

```powershell
git add src/shared/types.ts src/core/profile-dto-mapper.ts scripts/test-managed-extension-profile.cjs
git commit -m "feat: add managed extension profile fields"
```

Expected: commit succeeds and service test still fails because `extension-manager.ts` is not implemented.

---

### Task 3: Implement Extension Archive Service

**Files:**
- Create: `src/core/extension-manager.ts`

- [ ] **Step 1: Create service module types and exported functions**

Create `src/core/extension-manager.ts` with these public signatures:

```ts
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

import type { ManagedExtensionEngine, ManagedExtensionSource } from '../shared/types';

export interface PersistExtensionRequest {
  readonly rootDir: string;
  readonly engine: ManagedExtensionEngine;
  readonly extensionId: string;
  readonly displayName: string;
}

export interface PersistUploadedExtensionRequest extends PersistExtensionRequest {
  readonly sourcePath: string;
}

export interface PersistFolderExtensionRequest extends PersistExtensionRequest {
  readonly folderPath: string;
}

export interface PersistedExtensionFiles {
  readonly name: string;
  readonly source: ManagedExtensionSource;
  readonly fileName: string;
  readonly storedPath: string;
  readonly unpackedPath?: string;
  readonly effectivePath: string;
}
```

- [ ] **Step 2: Implement package persistence**

Add:

```ts
/** 保存上传扩展包，并返回启动时真正使用的路径。 */
export function persistUploadedExtension(request: PersistUploadedExtensionRequest): PersistedExtensionFiles {
  const sourcePath = resolve(request.sourcePath);
  if (!existsSync(sourcePath)) {
    throw new Error(`扩展文件不存在: ${sourcePath}`);
  }

  const suffix = extname(sourcePath).toLowerCase();
  ensureSupportedPackage(request.engine, suffix);

  const engineDir = getExtensionDir(request.rootDir, request.engine, request.extensionId);
  rmSync(engineDir, { recursive: true, force: true });
  mkdirSync(engineDir, { recursive: true });

  const fileName = basename(sourcePath);
  const storedPath = join(engineDir, fileName);
  const raw = readSourceFile(sourcePath);
  writeFileSync(storedPath, raw);

  if (request.engine === 'chromium') {
    const unpackedPath = join(engineDir, 'unpacked');
    const zipBytes = suffix === '.crx' ? extractZipPayloadFromCrx(raw) : raw;
    safeExtractZip(zipBytes, unpackedPath);
    const effectivePath = discoverExtensionDirectoryRoot(unpackedPath);
    ensureManifest(effectivePath, 'Chrome 扩展里没有找到 manifest.json');
    return toPersisted(request.displayName, 'package', fileName, storedPath, unpackedPath, effectivePath);
  }

  const firefoxPath = suffix === '.xpi' ? storedPath : storedPath.replace(/\.[^.]+$/, '.xpi');
  if (firefoxPath !== storedPath) {
    writeFileSync(firefoxPath, raw);
    rmSync(storedPath, { force: true });
  }
  return toPersisted(request.displayName, 'package', basename(firefoxPath), firefoxPath, undefined, firefoxPath);
}
```

Also import `readFileSync` from `node:fs`.

- [ ] **Step 3: Implement folder persistence**

Add:

```ts
/** 导入本地扩展目录；Chromium 保留目录，Firefox 打包为 XPI。 */
export function persistExtensionFolder(request: PersistFolderExtensionRequest): PersistedExtensionFiles {
  const folderPath = resolve(request.folderPath);
  if (!existsSync(folderPath)) {
    throw new Error(`扩展文件夹不存在: ${folderPath}`);
  }

  const extensionRoot = discoverExtensionDirectoryRoot(folderPath);
  ensureManifest(extensionRoot, '扩展文件夹里没有找到 manifest.json');

  const engineDir = getExtensionDir(request.rootDir, request.engine, request.extensionId);
  rmSync(engineDir, { recursive: true, force: true });
  mkdirSync(engineDir, { recursive: true });

  if (request.engine === 'chromium') {
    const unpackedPath = join(engineDir, 'unpacked');
    copyDirectory(extensionRoot, unpackedPath);
    const effectivePath = discoverExtensionDirectoryRoot(unpackedPath);
    ensureManifest(effectivePath, 'Chrome 扩展文件夹里没有找到 manifest.json');
    return toPersisted(request.displayName, 'folder', basename(extensionRoot), unpackedPath, unpackedPath, effectivePath);
  }

  const fileName = `${safeFolderName(basename(extensionRoot))}.xpi`;
  const storedPath = join(engineDir, fileName);
  zipDirectory(extensionRoot, storedPath);
  return toPersisted(request.displayName, 'folder', basename(extensionRoot), storedPath, undefined, storedPath);
}
```

- [ ] **Step 4: Implement ZIP safety helpers**

Add helpers with Chinese comments:

```ts
/** 从 CRX 文件中定位真正的 ZIP 内容，兼容常见 CRX 头部。 */
export function extractZipPayloadFromCrx(raw: Buffer): Buffer {
  const index = raw.indexOf(Buffer.from('PK\u0003\u0004', 'binary'));
  if (index < 0) {
    throw new Error('CRX 文件解析失败，未找到扩展内容');
  }
  return raw.subarray(index);
}

/** 安全解压 ZIP，拒绝写入目标目录之外的路径。 */
export function safeExtractZip(zipBytes: Buffer, targetDir: string): void {
  const root = resolve(targetDir);
  const zip = new AdmZip(zipBytes);
  mkdirSync(root, { recursive: true });
  for (const entry of zip.getEntries()) {
    const target = resolve(root, entry.entryName);
    if (target !== root && !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
      throw new Error('扩展文件路径非法');
    }
    if (entry.isDirectory) {
      mkdirSync(target, { recursive: true });
      continue;
    }
    mkdirSync(resolve(target, '..'), { recursive: true });
    writeFileSync(target, entry.getData());
  }
}
```

Add `discoverExtensionDirectoryRoot`, `copyDirectory`, `zipDirectory`, `safeFolderName`, `getFirefoxExtensionTargetName`, `removeExtensionStorage`, `ensureSupportedPackage`, `ensureManifest`, `getExtensionDir`, `readSourceFile`, and `toPersisted` in the same file. Keep the file below 400 lines; split into `src/core/extension-archive.ts` only if the count exceeds the limit.

- [ ] **Step 5: Run service test**

Run:

```powershell
node scripts/test-managed-extension-service.cjs
```

Expected: PASS with `managed extension service tests passed`.

- [ ] **Step 6: Commit extension service**

Run:

```powershell
git add src/core/extension-manager.ts
git commit -m "feat: add managed extension archive service"
```

Expected: commit succeeds.

---

### Task 4: Add Store and IPC

**Files:**
- Create: `src/main/managed-extension-store.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Extend preload API types**

In `src/shared/types.ts`, add to `BrowserShellApi`:

```ts
readonly listManagedExtensions: () => Promise<readonly ManagedExtension[]>;
readonly importManagedExtensionPackage: (engine: ManagedExtensionEngine, name: string) => Promise<ManagedExtension | undefined>;
readonly importManagedExtensionFolder: (engine: ManagedExtensionEngine, name: string) => Promise<ManagedExtension | undefined>;
readonly updateManagedExtension: (extensionId: string, update: ManagedExtensionUpdate) => Promise<ManagedExtension>;
readonly deleteManagedExtension: (extensionId: string) => Promise<void>;
```

- [ ] **Step 2: Create store**

Create `src/main/managed-extension-store.ts`:

```ts
import { app } from 'electron';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ManagedExtension, ManagedExtensionUpdate } from '../shared/types';

/** 管理应用中心扩展元数据，扩展文件本体由 core 层导入服务维护。 */
export class ManagedExtensionStore {
  public async list(): Promise<readonly ManagedExtension[]> {
    const items = await this.readItems();
    return items.map((item) => this.withExists(item));
  }

  public async append(item: ManagedExtension): Promise<ManagedExtension> {
    const items = await this.readItems();
    await this.saveItems([item, ...items]);
    return this.withExists(item);
  }

  public async update(extensionId: string, update: ManagedExtensionUpdate): Promise<ManagedExtension> {
    const items = await this.readItems();
    let updated: ManagedExtension | undefined;
    const nextItems = items.map((item) => {
      if (item.id !== extensionId) {
        return item;
      }
      updated = {
        ...item,
        name: update.name?.trim() || item.name,
        enabled: update.enabled ?? item.enabled,
        updatedAt: new Date().toISOString()
      };
      return updated;
    });
    if (!updated) {
      throw new Error(`扩展不存在: ${extensionId}`);
    }
    await this.saveItems(nextItems);
    return this.withExists(updated);
  }

  public async delete(extensionId: string): Promise<ManagedExtension> {
    const items = await this.readItems();
    const deleted = items.find((item) => item.id === extensionId);
    if (!deleted) {
      throw new Error(`扩展不存在: ${extensionId}`);
    }
    await this.saveItems(items.filter((item) => item.id !== extensionId));
    return deleted;
  }

  public getExtensionsRoot(): string {
    return join(app.getPath('userData'), 'extensions');
  }

  private async readItems(): Promise<readonly ManagedExtension[]> {
    try {
      return JSON.parse(await readFile(this.getFilePath(), 'utf8')) as readonly ManagedExtension[];
    } catch {
      return [];
    }
  }

  private async saveItems(items: readonly ManagedExtension[]): Promise<void> {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  }

  private withExists(item: ManagedExtension): ManagedExtension {
    return { ...item, exists: existsSync(item.effectivePath) };
  }

  private getFilePath(): string {
    return join(app.getPath('userData'), 'managed-extensions.json');
  }
}
```

- [ ] **Step 3: Register IPC handlers**

In `src/main/ipc.ts`, create `managedExtensionStore` beside existing stores and add handlers:

```ts
ipcMain.handle('extensions:list', () => managedExtensionStore.list());
ipcMain.handle('extensions:import-package', (event, engine: ManagedExtensionEngine, name: string) =>
  importExtensionPackage(event.sender, engine, name)
);
ipcMain.handle('extensions:import-folder', (event, engine: ManagedExtensionEngine, name: string) =>
  importExtensionFolder(event.sender, engine, name)
);
ipcMain.handle('extensions:update', (_event, extensionId: string, update: ManagedExtensionUpdate) =>
  managedExtensionStore.update(extensionId, update)
);
ipcMain.handle('extensions:delete', async (_event, extensionId: string) => {
  const deleted = await managedExtensionStore.delete(extensionId);
  removeExtensionStorage(managedExtensionStore.getExtensionsRoot(), deleted.engine, deleted.id);
  await engine.removeDisabledExtensionId(extensionId);
});
```

Implement `importExtensionPackage` and `importExtensionFolder` below `buildRegionLabel`. Use `dialog.showOpenDialog(BrowserWindow.fromWebContents(sender), ...)`, `randomUUID()`, and the core persistence functions. Return `undefined` when the user cancels the native file picker.

- [ ] **Step 4: Expose preload methods**

In `src/preload/preload.ts`, add methods:

```ts
listManagedExtensions: () =>
  ipcRenderer.invoke('extensions:list') as Promise<readonly ManagedExtension[]>,
importManagedExtensionPackage: (engine: ManagedExtensionEngine, name: string) =>
  ipcRenderer.invoke('extensions:import-package', engine, name) as Promise<ManagedExtension | undefined>,
importManagedExtensionFolder: (engine: ManagedExtensionEngine, name: string) =>
  ipcRenderer.invoke('extensions:import-folder', engine, name) as Promise<ManagedExtension | undefined>,
updateManagedExtension: (extensionId: string, update: ManagedExtensionUpdate) =>
  ipcRenderer.invoke('extensions:update', extensionId, update) as Promise<ManagedExtension>,
deleteManagedExtension: (extensionId: string) =>
  ipcRenderer.invoke('extensions:delete', extensionId) as Promise<void>,
```

- [ ] **Step 5: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: FAIL only if `BrowserEngine` has not yet implemented `removeDisabledExtensionId` or constructor injection. Task 5 resolves that.

- [ ] **Step 6: Commit store and IPC after Task 5 passes**

Do not commit this task until Task 5 makes typecheck pass, because `ipc.ts` depends on engine changes from the next task.

---

### Task 5: Integrate Extension Loading Into Browser Engines

**Files:**
- Modify: `src/core/browser-engine.ts`
- Modify: `src/core/firefox-profile-launcher.ts`
- Modify: `src/main/ipc.ts`

- [ ] **Step 1: Add provider interface and pure path filter**

In `src/core/browser-engine.ts`, add:

```ts
export interface ManagedExtensionProvider {
  readonly listManagedExtensions: () => Promise<readonly ManagedExtension[]>;
}

/** 根据内核和 profile 禁用列表选出本次启动需要加载的扩展路径。 */
export function getEnabledExtensionPaths(
  extensions: readonly ManagedExtension[],
  engine: BrowserKernelEngine,
  disabledIds: readonly string[]
): readonly string[] {
  const disabled = new Set(disabledIds);
  return extensions
    .filter((extension) => extension.engine === engine)
    .filter((extension) => extension.enabled && extension.exists)
    .filter((extension) => !disabled.has(extension.id))
    .map((extension) => extension.effectivePath);
}
```

Import `ManagedExtension`, `BrowserKernelEngine`, and use no broad object aliases.

- [ ] **Step 2: Write provider into constructor**

Change constructor:

```ts
public constructor(private readonly extensionProvider: ManagedExtensionProvider) {
  this.profiles = new BrowserProfiles();
}
```

In `src/main/ipc.ts`, construct:

```ts
const managedExtensionStore = new ManagedExtensionStore();
const engine = new BrowserEngine({
  listManagedExtensions: () => managedExtensionStore.list()
});
```

- [ ] **Step 3: Pass Chromium extension paths to core library**

In `launchProfile`, before Chromium launch:

```ts
const extensions = await this.getLaunchExtensionPaths(extendedProfile, kernel.engine);
const session: BrowserLaunchResult = await this.profiles.launchByIdOrName(idOrName, {
  chromePath: kernel.executablePath,
  extensions,
  headless: false
});
```

Add private helper:

```ts
/** 读取全局扩展并排除当前 profile 禁用项。 */
private async getLaunchExtensionPaths(
  profile: ExtendedStoredProfile,
  engine: BrowserKernelEngine
): Promise<readonly string[]> {
  return getEnabledExtensionPaths(
    await this.extensionProvider.listManagedExtensions(),
    engine,
    profile.disabledGlobalExtensionIds ?? []
  );
}
```

- [ ] **Step 4: Add profile cleanup method**

In `BrowserEngine`, add:

```ts
/** 删除扩展后清理所有 profile 中残留的禁用扩展 id。 */
public async removeDisabledExtensionId(extensionId: string): Promise<void> {
  const profiles = await this.profiles.list();
  for (const profile of profiles) {
    const extendedProfile: ExtendedStoredProfile = profile;
    const nextIds = (extendedProfile.disabledGlobalExtensionIds ?? []).filter((id) => id !== extensionId);
    if (nextIds.length !== (extendedProfile.disabledGlobalExtensionIds ?? []).length) {
      await this.profiles.update(profile.id, { disabledGlobalExtensionIds: nextIds });
    }
  }
  this.notifyChanged();
}
```

- [ ] **Step 5: Pass Firefox XPI paths**

Extend `FirefoxLaunchProfile` in `src/core/firefox-profile-launcher.ts`:

```ts
readonly extensionPaths: readonly string[];
```

In `BrowserEngine.launchFirefoxProfile`, pass:

```ts
extensionPaths: await this.getLaunchExtensionPaths(profile, 'firefox'),
```

- [ ] **Step 6: Copy Firefox extensions before launch**

In `FirefoxProfileLauncher.launch`, after `writeUserPrefs`, call:

```ts
await this.prepareExtensions(profile.extensionPaths, profileDir);
```

Add:

```ts
/** Firefox 通过 profile/extensions 目录安装 XPI，启动前复制本次启用的扩展。 */
private async prepareExtensions(extensionPaths: readonly string[], profileDir: string): Promise<void> {
  const extensionDir = join(profileDir, 'extensions');
  await rm(extensionDir, { recursive: true, force: true });
  if (extensionPaths.length === 0) {
    return;
  }

  await mkdir(extensionDir, { recursive: true });
  for (const extensionPath of extensionPaths) {
    const targetName = getFirefoxExtensionTargetName(extensionPath);
    await copyFile(extensionPath, join(extensionDir, targetName));
  }
}
```

Import `copyFile` and `rm` from `node:fs/promises`, and `getFirefoxExtensionTargetName` from `./extension-manager`.

In `getFingerprintPrefs`, when extensions exist, include prefs that allow scanning profile extensions:

```ts
lines.push('user_pref("extensions.autoDisableScopes", 0);');
lines.push('user_pref("extensions.enabledScopes", 15);');
lines.push('user_pref("extensions.startupScanScopes", 15);');
lines.push('user_pref("extensions.installDistroAddons", false);');
```

Use a `hasExtensions` flag so these prefs are written only when extension paths are present.

- [ ] **Step 7: Extend profile test for path filtering**

Append to `scripts/test-managed-extension-profile.cjs`:

```js
const browserEngine = loadTsModule('src/core/browser-engine.ts');
assert.deepEqual(browserEngine.getEnabledExtensionPaths([
  { id: 'a', engine: 'chromium', enabled: true, exists: true, effectivePath: 'C:/ext/a' },
  { id: 'b', engine: 'chromium', enabled: true, exists: true, effectivePath: 'C:/ext/b' },
  { id: 'c', engine: 'firefox', enabled: true, exists: true, effectivePath: 'C:/ext/c.xpi' },
  { id: 'd', engine: 'chromium', enabled: false, exists: true, effectivePath: 'C:/ext/d' },
  { id: 'e', engine: 'chromium', enabled: true, exists: false, effectivePath: 'C:/ext/e' }
], 'chromium', ['b']), ['C:/ext/a']);
```

- [ ] **Step 8: Run tests and typecheck**

Run:

```powershell
node scripts/test-managed-extension-profile.cjs
npm run typecheck
```

Expected: both commands PASS.

- [ ] **Step 9: Commit engine integration and IPC**

Run:

```powershell
git add src/core/browser-engine.ts src/core/firefox-profile-launcher.ts src/main/ipc.ts src/main/managed-extension-store.ts src/preload/preload.ts src/shared/types.ts scripts/test-managed-extension-profile.cjs
git commit -m "feat: load managed extensions on profile launch"
```

Expected: commit succeeds.

---

### Task 6: Build Application Center Extension Page

**Files:**
- Create: `src/renderer/src/components/feature/managed-extensions-page.tsx`
- Modify: `src/renderer/src/components/feature/feature-page.tsx`
- Create: `scripts/test-managed-extension-ui.cjs`

- [ ] **Step 1: Write UI static test**

Create `scripts/test-managed-extension-ui.cjs`:

```js
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const featurePage = readFileSync(join(root, 'src/renderer/src/components/feature/feature-page.tsx'), 'utf8');
const managedPage = readFileSync(join(root, 'src/renderer/src/components/feature/managed-extensions-page.tsx'), 'utf8');
const formFields = readFileSync(join(root, 'src/renderer/src/components/profiles/profile-form-fields.tsx'), 'utf8');
const formDraft = readFileSync(join(root, 'src/renderer/src/components/profiles/profile-form-draft.ts'), 'utf8');

assert.match(featurePage, /ManagedExtensionsPage/);
assert.match(managedPage, /importManagedExtensionPackage/);
assert.match(managedPage, /importManagedExtensionFolder/);
assert.match(managedPage, /updateManagedExtension/);
assert.match(managedPage, /deleteManagedExtension/);
assert.match(formFields, /disabledGlobalExtensionIds/);
assert.match(formDraft, /disabledGlobalExtensionIds/);

console.log('managed extension UI checks passed');
```

Run now:

```powershell
node scripts/test-managed-extension-ui.cjs
```

Expected: FAIL because `managed-extensions-page.tsx` does not exist.

- [ ] **Step 2: Create managed extension page**

Create `src/renderer/src/components/feature/managed-extensions-page.tsx` with:

```tsx
import { Button, Empty, Input, Popconfirm, Segmented, Switch, Tag, message as antdMessage } from 'antd';
import { FolderOpen, PackagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { ManagedExtension, ManagedExtensionEngine } from '../../../../shared/types';

/** 应用中心扩展管理页，负责导入、启停和删除本地全局扩展。 */
export function ManagedExtensionsPage(): JSX.Element {
  const [engine, setEngine] = useState<ManagedExtensionEngine>('chromium');
  const [name, setName] = useState('');
  const [extensions, setExtensions] = useState<readonly ManagedExtension[]>([]);
  const [loading, setLoading] = useState(false);

  const visibleExtensions = useMemo(
    () => extensions.filter((extension) => extension.engine === engine),
    [engine, extensions]
  );

  useEffect(() => {
    void refreshExtensions();
  }, []);

  async function refreshExtensions(): Promise<void> {
    setLoading(true);
    try {
      setExtensions(await window.browserShell.listManagedExtensions());
    } finally {
      setLoading(false);
    }
  }

  async function importPackage(): Promise<void> {
    const saved = await window.browserShell.importManagedExtensionPackage(engine, name);
    if (!saved) {
      return;
    }
    setName('');
    await refreshExtensions();
    void antdMessage.success('扩展包已导入');
  }

  async function importFolder(): Promise<void> {
    const saved = await window.browserShell.importManagedExtensionFolder(engine, name);
    if (!saved) {
      return;
    }
    setName('');
    await refreshExtensions();
    void antdMessage.success('扩展文件夹已导入');
  }

  async function toggleExtension(extension: ManagedExtension, enabled: boolean): Promise<void> {
    await window.browserShell.updateManagedExtension(extension.id, { enabled });
    await refreshExtensions();
  }

  async function deleteExtension(extension: ManagedExtension): Promise<void> {
    await window.browserShell.deleteManagedExtension(extension.id);
    await refreshExtensions();
    void antdMessage.success('扩展已删除');
  }

  return (
    <section className="flex flex-1 overflow-hidden bg-background">
      <div className="w-[360px] shrink-0 border-r bg-card p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">扩展管理</h2>
          <p className="mt-1 text-sm text-muted-foreground">导入本地扩展并按内核全局启用。</p>
        </div>
        <div className="grid gap-4">
          <Segmented
            block
            onChange={(value) => setEngine(value as ManagedExtensionEngine)}
            options={[
              { label: 'Chromium', value: 'chromium' },
              { label: 'Firefox', value: 'firefox' }
            ]}
            value={engine}
          />
          <Input onChange={(event) => setName(event.target.value)} placeholder="显示名称，可留空" value={name} />
          <Button htmlType="button" onClick={() => void importPackage()} type="primary">
            <PackagePlus className="size-4" />导入扩展包
          </Button>
          <Button htmlType="button" onClick={() => void importFolder()}>
            <FolderOpen className="size-4" />导入文件夹
          </Button>
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">共 {visibleExtensions.length} 个扩展</div>
          <Button htmlType="button" loading={loading} onClick={() => void refreshExtensions()}>
            <RefreshCw className="size-4" />刷新
          </Button>
        </div>
        {visibleExtensions.length === 0 ? <Empty description="暂无扩展" /> : (
          <div className="grid gap-3">
            {visibleExtensions.map((extension) => (
              <article className="rounded-lg border bg-card p-4" key={extension.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{extension.name}</h3>
                      <Tag color={extension.exists ? 'green' : 'red'}>{extension.exists ? '文件存在' : '文件缺失'}</Tag>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{extension.fileName}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{extension.effectivePath}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch checked={extension.enabled} onChange={(checked) => void toggleExtension(extension, checked)} />
                    <Popconfirm description="删除后会同步清理 profile 禁用记录。" onConfirm={() => void deleteExtension(extension)} title="删除扩展？">
                      <Button danger htmlType="button" size="small">
                        <Trash2 className="size-4" />
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Route apps module to real page**

In `src/renderer/src/components/feature/feature-page.tsx`, import `ManagedExtensionsPage` and add before the fallback cards:

```tsx
if (config.key === 'apps') {
  return <ManagedExtensionsPage />;
}
```

- [ ] **Step 4: Run UI static test and typecheck**

Run:

```powershell
node scripts/test-managed-extension-ui.cjs
npm run typecheck
```

Expected: UI static test still FAIL until Task 7 adds profile form fields; typecheck PASS.

- [ ] **Step 5: Commit app center page after Task 7 passes**

Do not commit this task until Task 7 completes the UI static checks.

---

### Task 7: Add Per-Profile Disable Controls

**Files:**
- Modify: `src/renderer/src/components/profiles/browser-kernel-options.ts`
- Modify: `src/renderer/src/components/profiles/profile-form-page.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-draft.ts`
- Modify: `src/renderer/src/app-helpers.ts`

- [ ] **Step 1: Export kernel engine helper**

In `browser-kernel-options.ts`, add:

```ts
/** 根据内核 id 找到所属引擎，表单筛选扩展时使用。 */
export function getKernelEngine(kernelId: string): BrowserKernelEngine {
  return browserKernelOptions.find((option) => option.id === kernelId)?.engine ?? 'chromium';
}
```

- [ ] **Step 2: Pass kernel to AppsTab**

In `profile-form-page.tsx`, change the AppsTab render to pass `kernel`:

```tsx
<AppsTab
  initialProfile={initialProfile}
  kernel={kernel}
  loadImages={loadImages}
  loadVideos={loadVideos}
  setLoadImages={setLoadImages}
  setLoadVideos={setLoadVideos}
/>
```

- [ ] **Step 3: Add extension disable list to AppsTab**

In `profile-form-fields.tsx`, update `AppsTab` props and body. Add imports:

```ts
import { useEffect, useMemo, useState } from 'react';
import type { ManagedExtension } from '../../../../shared/types';
import { getKernelEngine } from './browser-kernel-options';
```

Inside `AppsTab`, load extensions:

```tsx
const [extensions, setExtensions] = useState<readonly ManagedExtension[]>([]);
const engine = getKernelEngine(kernel);
const visibleExtensions = useMemo(
  () => extensions.filter((extension) => extension.engine === engine),
  [engine, extensions]
);
const disabledIds = new Set(initialProfile?.disabledGlobalExtensionIds ?? []);

useEffect(() => {
  void window.browserShell.listManagedExtensions().then(setExtensions);
}, []);
```

Render after image/video switches:

```tsx
<div className="grid grid-cols-[128px_1fr] items-start gap-3">
  <span className="pt-2 text-sm text-secondary">全局扩展</span>
  <div className="grid gap-2">
    {visibleExtensions.length === 0 ? (
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">当前内核暂无全局扩展。</p>
    ) : visibleExtensions.map((extension) => (
      <label className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm" key={extension.id}>
        <span className="min-w-0">
          <span className="block truncate font-medium">{extension.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{extension.fileName}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          禁用
          <input defaultChecked={disabledIds.has(extension.id)} name="disabledGlobalExtensionIds" type="checkbox" value={extension.id} />
        </span>
      </label>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Collect disabled ids from form**

In `profile-form-draft.ts`, add:

```ts
disabledGlobalExtensionIds: form.getAll('disabledGlobalExtensionIds').flatMap((value) => {
  const normalized = text(value);
  return normalized ? [normalized] : [];
}),
```

- [ ] **Step 5: Preserve field in helper conversion**

In `src/renderer/src/app-helpers.ts`, update `toProfileDraft` to carry:

```ts
disabledGlobalExtensionIds: detail.disabledGlobalExtensionIds,
```

- [ ] **Step 6: Run UI test and typecheck**

Run:

```powershell
node scripts/test-managed-extension-ui.cjs
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 7: Commit renderer integration**

Run:

```powershell
git add src/renderer/src/components/feature/managed-extensions-page.tsx src/renderer/src/components/feature/feature-page.tsx src/renderer/src/components/profiles/browser-kernel-options.ts src/renderer/src/components/profiles/profile-form-page.tsx src/renderer/src/components/profiles/profile-form-fields.tsx src/renderer/src/components/profiles/profile-form-draft.ts src/renderer/src/app-helpers.ts scripts/test-managed-extension-ui.cjs
git commit -m "feat: add application center extension UI"
```

Expected: commit succeeds.

---

### Task 8: Final Verification

**Files:**
- No source edits unless a verification command exposes a defect.

- [ ] **Step 1: Run extension tests**

Run:

```powershell
npm run test:managed-extensions
```

Expected:

```text
managed extension service tests passed
managed extension profile tests passed
managed extension UI checks passed
```

- [ ] **Step 2: Run existing UI checks**

Run:

```powershell
npm run test:profile-table-ui
npm run test:topbar-ui
```

Expected: both scripts pass.

- [ ] **Step 3: Run TypeScript verification**

Run:

```powershell
npm run typecheck
```

Expected: main and renderer TypeScript projects pass without errors.

- [ ] **Step 4: Check line counts**

Run:

```powershell
$files = @(
  'src\core\extension-manager.ts',
  'src\main\managed-extension-store.ts',
  'src\renderer\src\components\feature\managed-extensions-page.tsx',
  'src\renderer\src\components\profiles\profile-form-fields.tsx',
  'src\core\browser-engine.ts',
  'src\core\firefox-profile-launcher.ts',
  'src\shared\types.ts'
)
foreach ($file in $files) {
  $count = (Get-Content -LiteralPath $file -Encoding UTF8).Count
  if ($count -gt 400) { throw "$file has $count lines" }
  "$file $count"
}
```

Expected: every listed file reports 400 lines or fewer.

- [ ] **Step 5: Inspect worktree**

Run:

```powershell
git status --short
```

Expected: only intended implementation files are modified. Existing unrelated user edits can remain unstaged if they were present before this plan.

---

## Self-Review

- Spec coverage: Tasks 1 and 3 cover package/folder import, CRX payload extraction, safe ZIP handling, Firefox XPI packing and deletion. Tasks 4 and 5 cover persistence, IPC, preload, launch mounting and profile cleanup. Tasks 6 and 7 cover application center UI and per-profile disabled extension ids. Task 8 covers verification.
- Placeholder scan: The plan contains concrete file paths, commands, expected outputs and code shapes for every implementation step.
- Type consistency: The plan consistently uses `ManagedExtensionEngine`, `ManagedExtension`, `ManagedExtensionUpdate`, `disabledGlobalExtensionIds`, `listManagedExtensions`, `importManagedExtensionPackage`, `importManagedExtensionFolder`, `updateManagedExtension` and `deleteManagedExtension`.
