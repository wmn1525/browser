# Fingerprint Config Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 profile 指纹配置项，并让 Chromium 通过 CDP 注入生效、Firefox 通过稳定 `user.js` 偏好项生效。

**Architecture:** 共享 DTO 保存业务配置，renderer 表单只负责采集和回填，core 层负责把业务配置映射到浏览器启动配置。Chromium 补充指纹脚本放在独立 core 模块，Firefox 偏好项写入保留在 Firefox 启动器内。

**Tech Stack:** Electron 31、React 18、TypeScript 5、antd、`@aitofy/browser-profiles`、`chrome-remote-interface`、Node 脚本测试。

---

## File Structure

- Modify: `package.json` and `package-lock.json`，声明直接使用的 `chrome-remote-interface` 依赖。
- Modify: `src/shared/types.ts`，新增指纹模式、Client Hints 和扩展后的 `FingerprintDraft` 字段。
- Modify: `src/core/profile-dto-mapper.ts`，把 UI 指纹配置映射到核心库支持的运行时 fingerprint。
- Create: `src/core/chrome-remote-interface.d.ts`，为本项目用到的 CDP API 提供窄类型声明。
- Create: `src/core/chromium-fingerprint-runtime.ts`，生成并注入 Chromium 补充指纹脚本。
- Modify: `src/core/browser-engine.ts`，Chromium 启动后调用补充注入，Firefox 启动时传入更多 profile 字段。
- Modify: `src/core/firefox-profile-launcher.ts`，写入 UA、语言、时区、WebRTC、Service Worker、媒体加载等 prefs。
- Modify: `src/renderer/src/components/profiles/profile-fingerprint-options.ts`，补齐模式、Client Hints、色深等选项。
- Create: `src/renderer/src/components/profiles/profile-fingerprint-values.ts`，承载指纹表单默认值、随机值和选项查找逻辑。
- Modify: `src/renderer/src/components/profiles/profile-fingerprint-tab.tsx`，只保留展示组件和表单字段。
- Modify: `src/renderer/src/components/profiles/profile-form-draft.ts`，采集新增字段。
- Create: `scripts/test-fingerprint-runtime.cjs`，覆盖表单采集、DTO 映射和 Chromium 脚本生成。

---

### Task 1: Add Runtime Tests

**Files:**
- Create: `scripts/test-fingerprint-runtime.cjs`

- [ ] **Step 1: Write the failing test**

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

console.log('fingerprint runtime tests passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-fingerprint-runtime.cjs`

Expected: FAIL because `src/core/chromium-fingerprint-runtime.ts` does not exist and new fields are not present.

- [ ] **Step 3: Commit the failing test**

```bash
git add scripts/test-fingerprint-runtime.cjs
git commit -m "test: add fingerprint runtime coverage"
```

---

### Task 2: Extend Shared DTO and Mapping

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/core/profile-dto-mapper.ts`

- [ ] **Step 1: Add shared fingerprint types**

In `src/shared/types.ts`, add these exported types before `FingerprintDraft` and extend `FingerprintDraft`:

```ts
/** 指纹检测面的运行策略，值域对齐参考配置但保持业务语义命名。 */
export type FingerprintHookMode = 'default' | 'value' | 'page' | 'browser' | 'domain' | 'global' | 'enabled' | 'disabled';

/** Chromium Client Hints 的可保存配置，避免使用宽泛对象承载。 */
export interface ClientHintsDraft {
  readonly platform?: string;
  readonly platformVersion?: string;
  readonly architecture?: string;
  readonly mobile?: boolean;
  readonly brandVersion?: string;
}
```

Add fields to `FingerprintDraft`:

```ts
  readonly userAgent?: string;
  readonly languages?: string;
  readonly screenColorDepth?: number;
  readonly screenPixelDepth?: number;
  readonly clientHintsMode?: FingerprintHookMode;
  readonly clientHintsPlatform?: string;
  readonly clientHintsPlatformVersion?: string;
  readonly clientHintsArchitecture?: string;
  readonly clientHintsMobile?: boolean;
  readonly clientHintsBrandVersion?: string;
  readonly audioMode?: FingerprintHookMode;
  readonly audioValue?: string;
  readonly webgpuMode?: FingerprintHookMode;
  readonly webgpuValue?: string;
  readonly webrtcMode?: FingerprintHookMode;
  readonly serviceWorkerMode?: FingerprintHookMode;
```

- [ ] **Step 2: Map UI fields to runtime fingerprint**

In `src/core/profile-dto-mapper.ts`, make `normalizeFingerprint` receive `draft.userAgent` and return core-supported fields:

```ts
function normalizeFingerprint(fingerprint: FingerprintDraft | undefined, userAgent: string | undefined): FingerprintDraft | undefined {
  if (!fingerprint) {
    return undefined;
  }

  const screen = fingerprint.screenWidth && fingerprint.screenHeight
    ? { width: fingerprint.screenWidth, height: fingerprint.screenHeight }
    : undefined;
  const webgl = fingerprint.webglVendor || fingerprint.webglRenderer
    ? { vendor: cleanText(fingerprint.webglVendor), renderer: cleanText(fingerprint.webglRenderer) }
    : undefined;

  return {
    userAgent: cleanText(userAgent),
    platform: cleanText(fingerprint.platform),
    language: cleanText(fingerprint.language),
    languages: cleanText(fingerprint.languages),
    hardwareConcurrency: fingerprint.hardwareConcurrency,
    deviceMemory: fingerprint.deviceMemory,
    screen,
    screenWidth: fingerprint.screenWidth,
    screenHeight: fingerprint.screenHeight,
    screenColorDepth: fingerprint.screenColorDepth,
    screenPixelDepth: fingerprint.screenPixelDepth,
    webgl,
    webglVendor: cleanText(fingerprint.webglVendor),
    webglRenderer: cleanText(fingerprint.webglRenderer),
    hstsMode: cleanHookMode(fingerprint.hstsMode),
    hstsValue: cleanText(fingerprint.hstsValue),
    webglMode: cleanHookMode(fingerprint.webglMode),
    webglValue: cleanText(fingerprint.webglValue),
    canvasMode: cleanHookMode(fingerprint.canvasMode),
    canvasValue: cleanText(fingerprint.canvasValue),
    canvas: toNoiseMode(fingerprint.canvasMode),
    pluginsMode: cleanHookMode(fingerprint.pluginsMode),
    pluginsValue: cleanText(fingerprint.pluginsValue),
    rectsMode: cleanHookMode(fingerprint.rectsMode),
    rectsValue: cleanText(fingerprint.rectsValue),
    fontsMode: cleanHookMode(fingerprint.fontsMode),
    fontsValue: cleanText(fingerprint.fontsValue),
    batteryState: cleanText(fingerprint.batteryState),
    bluetoothState: cleanText(fingerprint.bluetoothState),
    networkState: cleanText(fingerprint.networkState),
    clientHintsMode: cleanHookMode(fingerprint.clientHintsMode),
    clientHintsPlatform: cleanText(fingerprint.clientHintsPlatform),
    clientHintsPlatformVersion: cleanText(fingerprint.clientHintsPlatformVersion),
    clientHintsArchitecture: cleanText(fingerprint.clientHintsArchitecture),
    clientHintsMobile: fingerprint.clientHintsMobile,
    clientHintsBrandVersion: cleanText(fingerprint.clientHintsBrandVersion),
    audioMode: cleanHookMode(fingerprint.audioMode),
    audioValue: cleanText(fingerprint.audioValue),
    audio: toNoiseMode(fingerprint.audioMode),
    webgpuMode: cleanHookMode(fingerprint.webgpuMode),
    webgpuValue: cleanText(fingerprint.webgpuValue),
    webrtcMode: cleanHookMode(fingerprint.webrtcMode),
    webrtc: toWebRtcMode(fingerprint.webrtcMode),
    serviceWorkerMode: cleanHookMode(fingerprint.serviceWorkerMode)
  };
}
```

- [ ] **Step 3: Run the focused test**

Run: `node scripts/test-fingerprint-runtime.cjs`

Expected: still FAIL because the Chromium runtime module and form field collection are not implemented.

---

### Task 3: Split and Extend Fingerprint Form

**Files:**
- Modify: `src/renderer/src/components/profiles/profile-fingerprint-options.ts`
- Create: `src/renderer/src/components/profiles/profile-fingerprint-values.ts`
- Modify: `src/renderer/src/components/profiles/profile-fingerprint-tab.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-draft.ts`

- [ ] **Step 1: Add options**

Add options for hook modes, Client Hints, screen depth and booleans:

```ts
export const fingerprintHookModeOptions: readonly Option[] = [
  { label: '系统值', value: 'default' },
  { label: '自定义值', value: 'value' },
  { label: '按标签页随机', value: 'page' },
  { label: '按浏览器启动随机', value: 'browser' },
  { label: '按域名随机', value: 'domain' },
  { label: '按全局种子随机', value: 'global' }
];

export const switchHookModeOptions: readonly Option[] = [
  { label: '系统值', value: 'default' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
];

export const screenDepthOptions: readonly Option[] = [
  { label: '24 / 24', value: '24x24' },
  { label: '30 / 30', value: '30x30' },
  { label: '32 / 32', value: '32x32' }
];
```

- [ ] **Step 2: Move value logic**

Create `profile-fingerprint-values.ts` with the `FingerprintValues` interface, `getInitialValues`, `getDefaultValues`, `getRandomValues`, `findScreen`, `findGpu` and option filtering helpers. Every exported function needs a Chinese comment describing its responsibility.

- [ ] **Step 3: Keep the tab under 400 lines**

In `profile-fingerprint-tab.tsx`, import value helpers and add fields for language list, screen depth, Client Hints, Audio, WebGPU, WebRTC and Service Worker. Keep this file focused on rendering.

- [ ] **Step 4: Collect new form fields**

In `profile-form-draft.ts`, read:

```ts
languages: text(form.get('languages')),
screenColorDepth: numberValue(form.get('screenColorDepth')),
screenPixelDepth: numberValue(form.get('screenPixelDepth')),
clientHintsMode: hookMode(form.get('clientHintsMode')),
clientHintsPlatform: text(form.get('clientHintsPlatform')),
clientHintsPlatformVersion: text(form.get('clientHintsPlatformVersion')),
clientHintsArchitecture: text(form.get('clientHintsArchitecture')),
clientHintsMobile: booleanText(form.get('clientHintsMobile')),
clientHintsBrandVersion: text(form.get('clientHintsBrandVersion')),
audioMode: hookMode(form.get('audioMode')),
audioValue: text(form.get('audioValue')),
webgpuMode: hookMode(form.get('webgpuMode')),
webgpuValue: text(form.get('webgpuValue')),
webrtcMode: hookMode(form.get('webrtcMode')),
serviceWorkerMode: hookMode(form.get('serviceWorkerMode')),
```

- [ ] **Step 5: Run the focused test**

Run: `node scripts/test-fingerprint-runtime.cjs`

Expected: still FAIL because the Chromium runtime module does not exist.

---

### Task 4: Add Chromium Runtime Injection

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/core/chrome-remote-interface.d.ts`
- Create: `src/core/chromium-fingerprint-runtime.ts`
- Modify: `src/core/browser-engine.ts`

- [ ] **Step 1: Add direct dependency**

Run: `npm install chrome-remote-interface@^0.33.3`

Expected: `package.json` and `package-lock.json` include `chrome-remote-interface`.

- [ ] **Step 2: Add CDP type declaration**

Create `src/core/chrome-remote-interface.d.ts`:

```ts
declare module 'chrome-remote-interface' {
  export interface ChromeRemoteInterfaceOptions {
    readonly port: number;
  }

  export interface ChromeRemoteInterfaceClient {
    readonly Page: {
      readonly enable: () => Promise<void>;
      readonly addScriptToEvaluateOnNewDocument: (options: { readonly source: string }) => Promise<void>;
    };
    readonly close: () => Promise<void>;
  }

  export default function CDP(options: ChromeRemoteInterfaceOptions): Promise<ChromeRemoteInterfaceClient>;
}
```

- [ ] **Step 3: Create script builder and injector**

Create `src/core/chromium-fingerprint-runtime.ts` exporting:

```ts
export function buildChromiumFingerprintPatchSource(profile: ExtendedStoredProfile): string;
export async function injectChromiumFingerprintPatch(port: number, profile: ExtendedStoredProfile): Promise<void>;
```

The builder should return an empty string when no supplemental fields are configured. The injector should skip empty source, otherwise call `Page.enable()` and `Page.addScriptToEvaluateOnNewDocument({ source })`.

- [ ] **Step 4: Call injector after Chromium launch**

In `BrowserEngine.launchProfile`, after `launchByIdOrName` returns and before marking the profile running, call:

```ts
await injectChromiumFingerprintPatch(session.port, extendedProfile);
```

Guard with a profile existence check so Chromium launch by missing ID still throws `Profile not found`.

- [ ] **Step 5: Run focused test**

Run: `node scripts/test-fingerprint-runtime.cjs`

Expected: PASS.

---

### Task 5: Add Firefox Stable Prefs

**Files:**
- Modify: `src/core/firefox-profile-launcher.ts`
- Modify: `src/core/browser-engine.ts`

- [ ] **Step 1: Extend launch profile**

Add these fields to `FirefoxLaunchProfile`:

```ts
readonly userAgent?: string;
readonly timezone?: string;
readonly fingerprint?: FingerprintDraft;
readonly loadImages?: boolean;
readonly loadVideos?: boolean;
```

- [ ] **Step 2: Write stable prefs**

Extend `writeUserPrefs` to append:

```ts
user_pref("general.useragent.override", "...user agent...");
user_pref("intl.accept_languages", "zh-CN, zh, en-US");
user_pref("javascript.use_us_english_locale", false);
user_pref("privacy.resistFingerprinting", false);
user_pref("media.peerconnection.enabled", false);
user_pref("dom.serviceWorkers.enabled", false);
user_pref("permissions.default.image", 2);
user_pref("media.autoplay.default", 5);
```

Only write each pref when the matching profile field requests it, so default mode keeps Firefox native behavior.

- [ ] **Step 3: Pass profile fields from engine**

In `launchFirefoxProfile`, pass `userAgent`, `timezone`, `fingerprint`, `loadImages` and `loadVideos` into `this.firefox.launch`.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

---

### Task 6: Final Verification

**Files:**
- No source edits unless verification reveals a defect.

- [ ] **Step 1: Run focused runtime test**

Run: `node scripts/test-fingerprint-runtime.cjs`

Expected: `fingerprint runtime tests passed`

- [ ] **Step 2: Run TypeScript verification**

Run: `npm run typecheck`

Expected: both main and renderer TypeScript projects pass without errors.

- [ ] **Step 3: Check file line counts**

Run:

```powershell
(Get-Content -LiteralPath 'src\renderer\src\components\profiles\profile-fingerprint-tab.tsx' -Encoding UTF8).Count
(Get-Content -LiteralPath 'src\renderer\src\components\profiles\profile-fingerprint-values.ts' -Encoding UTF8).Count
(Get-Content -LiteralPath 'src\core\chromium-fingerprint-runtime.ts' -Encoding UTF8).Count
```

Expected: each value is below 400.

- [ ] **Step 4: Commit implementation**

```bash
git add package.json package-lock.json scripts/test-fingerprint-runtime.cjs src
git commit -m "feat: apply fingerprint runtime configuration"
```

---

## Self-Review

- Spec coverage: Tasks 2 and 3 cover DTO and UI; Task 4 covers Chromium runtime; Task 5 covers Firefox stable prefs; Task 6 covers verification.
- Placeholder scan: No `TBD`, `TODO`, omitted commands, or unresolved implementation steps remain.
- Type consistency: New field names are consistent across form collection, shared DTO, mapper, runtime script and tests.
