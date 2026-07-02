# Background Tray And Firefox Gecko Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Electron 客户端关闭窗口后常驻托盘，并支持启动真实 Firefox/Gecko 浏览器进程。

**Architecture:** Electron 主进程负责托盘和退出生命周期。浏览器内核模型增加 `engine` 字段，Chrome 继续走现有 `@aitofy/browser-profiles`，Firefox 走独立子进程启动器。

**Tech Stack:** Electron 31, TypeScript, React, Node.js `child_process`, `fs`, `path`, `os`.

---

## File Structure

- Modify: `src/main/main.ts`，维护主窗口、托盘和显式退出状态。
- Modify: `src/shared/types.ts`，扩展内核 DTO 和 Firefox 启动返回字段。
- Modify: `src/core/browser-kernel-manager.ts`，检测本机 Firefox 并给内核返回 `engine`。
- Create: `src/core/firefox-profile-launcher.ts`，启动和关闭真实 Firefox 子进程。
- Modify: `src/core/browser-engine.ts`，按内核类型分流 Chrome 与 Firefox。
- Modify: `src/renderer/src/components/profiles/browser-kernel-options.ts`，新增本机 Firefox 选项。
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`，让 Firefox 选项展示合适图标与安装状态。
- Modify: `src/renderer/src/components/layout/topbar.tsx`，下载菜单只展示可下载的 Chrome 内核。

### Task 1: Tray Lifecycle

**Files:**
- Modify: `src/main/main.ts`

- [x] **Step 1: Add tray state and explicit quit flag**

```ts
let mainWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let isQuitting = false;
```

- [x] **Step 2: Intercept close and hide window**

```ts
window.on('close', (event) => {
  if (isQuitting) {
    return;
  }

  event.preventDefault();
  window.hide();
});
```

- [x] **Step 3: Create tray menu**

```ts
tray = new Tray(getWindowIconPath());
tray.setToolTip('ImRun Browser');
tray.setContextMenu(Menu.buildFromTemplate([
  { label: '打开主窗口', click: showMainWindow },
  { type: 'separator' },
  { label: '退出应用', click: quitApp }
]));
```

- [x] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: command exits with code 0.

### Task 2: Kernel DTO And Options

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/src/components/profiles/browser-kernel-options.ts`

- [x] **Step 1: Add engine field**

```ts
export type BrowserKernelEngine = 'chromium' | 'firefox';

export interface BrowserKernelInfo {
  readonly id: string;
  readonly label: string;
  readonly engine: BrowserKernelEngine;
  readonly majorVersion?: number;
  readonly version: string;
  readonly source: 'system' | 'downloaded' | 'remote';
  readonly isInstalled: boolean;
  readonly executablePath?: string;
}
```

- [x] **Step 2: Add Firefox UI option**

```ts
{
  id: 'system-firefox',
  label: '本机 Firefox',
  description: '启动真实 Firefox/Gecko 浏览器进程',
  engine: 'firefox',
  version: 'system'
}
```

- [x] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: TypeScript reports missing `engine` assignments before implementation, then passes after Task 3.

### Task 3: Firefox Detection

**Files:**
- Modify: `src/core/browser-kernel-manager.ts`

- [x] **Step 1: Return Firefox from kernel list**

```ts
return [
  this.detectSystemChrome(),
  this.detectSystemFirefox(),
  ...remote.map((kernel) => this.withInstallState(kernel))
];
```

- [x] **Step 2: Implement platform path detection**

```ts
private detectSystemFirefox(): BrowserKernelInfo {
  const executablePath = this.findFirstExistingPath(this.getFirefoxCandidates());
  return {
    id: 'system-firefox',
    label: '本机 Firefox',
    engine: 'firefox',
    version: executablePath ? '本机已安装' : '未检测到',
    source: 'system',
    isInstalled: Boolean(executablePath),
    executablePath
  };
}
```

- [x] **Step 3: Keep Chrome downloads Chromium-only**

```ts
private parseKernelId(kernelId: string): number {
  const match = /^chrome-(\d+)$/.exec(kernelId);
  // existing validation remains unchanged
}
```

- [x] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: command exits with code 0 after all `engine` fields are supplied.

### Task 4: Firefox Process Launcher

**Files:**
- Create: `src/core/firefox-profile-launcher.ts`

- [x] **Step 1: Create launcher class**

```ts
export class FirefoxProfileLauncher {
  public async launch(profile: FirefoxLaunchProfile, executablePath: string): Promise<FirefoxLaunchResult> {
    const profileDir = this.getProfileDir(profile.id);
    await mkdir(profileDir, { recursive: true });
    const child = spawn(executablePath, this.buildArgs(profile, profileDir), {
      detached: false,
      stdio: 'ignore',
      windowsHide: false
    });
    return { pid: child.pid, profileId: profile.id };
  }
}
```

- [x] **Step 2: Add close and exit tracking**

```ts
public close(profileId: string): void {
  const child = this.processes.get(profileId);
  if (!child) {
    return;
  }

  child.kill();
  this.processes.delete(profileId);
}
```

- [x] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: command exits with code 0 after BrowserEngine integration.

### Task 5: BrowserEngine Routing

**Files:**
- Modify: `src/core/browser-engine.ts`

- [x] **Step 1: Resolve selected kernel**

```ts
const kernel = await this.kernels.resolveKernel(extendedProfile?.browserKernel);
if (kernel.engine === 'firefox') {
  return this.launchFirefoxProfile(extendedProfile, kernel.executablePath);
}
```

- [x] **Step 2: Keep Chromium path unchanged**

```ts
const session = await this.profiles.launchByIdOrName(idOrName, {
  chromePath: kernel.executablePath,
  headless: false
});
```

- [x] **Step 3: Mark Firefox running by child process lifecycle**

```ts
this.firefox.launch(profile, executablePath, (profileId) => {
  this.runningProfiles.delete(profileId);
  this.notifyChanged();
});
```

- [x] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: command exits with code 0.

### Task 6: Renderer Display

**Files:**
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`
- Modify: `src/renderer/src/components/layout/topbar.tsx`

- [x] **Step 1: Use Firefox icon for Firefox option**

```tsx
const Icon = option.engine === 'firefox' ? Globe : Chrome;
```

- [x] **Step 2: Restrict download menu to Chrome remote kernels**

```ts
const kernelOptions = browserKernelOptions.filter((kernel) => kernel.engine === 'chromium' && kernel.id !== 'system-chrome');
```

- [x] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: command exits with code 0.

### Task 7: Final Verification

**Files:**
- No new code files.

- [x] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: command exits with code 0.

- [x] **Step 2: Inspect git diff**

Run: `git diff --stat`
Expected: diff only includes docs and the files listed above.
