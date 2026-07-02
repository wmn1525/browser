# Firefox Stable Kernel Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有内核下载菜单中加入 Windows 版 Firefox 最新稳定版、ESR 和历史稳定版下载，并让已下载 Firefox 可作为真实 Gecko 内核启动。

**Architecture:** `BrowserKernelManager` 继续作为统一内核入口，Firefox 具体列表、下载、解包和本机检测放到 `FirefoxKernelManager`。最新稳定版使用 Mozilla Product Details JSON 获取版本，固定稳定/ESR 版本使用 Mozilla release archive，并通过 `/ExtractDir` 解包到应用内核目录。

**Tech Stack:** TypeScript, Electron main process, Node.js `fetch`, `fs`, `child_process`, Windows Firefox installer.

---

## File Structure

- Modify: `src/core/browser-kernel-manager.ts`，加入 Firefox 下载分流。
- Create: `src/core/firefox-kernel-manager.ts`，管理本机 Firefox、最新稳定版、ESR 和历史稳定版。
- Modify: `src/renderer/src/components/profiles/browser-kernel-options.ts`，加入 Firefox 最新稳定版、ESR 和历史稳定版选项。
- Modify: `src/renderer/src/components/layout/topbar.tsx`，下载菜单展示可下载 Firefox。
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`，profile 表单中可下载 Firefox 内核。

### Task 1: Add Firefox Kernel Options

**Files:**
- Modify: `src/renderer/src/components/profiles/browser-kernel-options.ts`

- [x] **Step 1: Add stable Firefox options**

```ts
{
  id: 'firefox-latest',
  label: 'Firefox 最新稳定版',
  description: '下载 Mozilla 官方 Windows 64-bit Firefox',
  engine: 'firefox',
  version: 'latest'
}
firefox('firefox-152', 'Firefox 152.0.4', '152.0.4', 'Mozilla 官方稳定版')
firefox('firefox-140-esr', 'Firefox 140.6.0 ESR', '140.6.0esr', 'Mozilla 官方 ESR 稳定版')
```

### Task 2: Add Firefox Download In Kernel Manager

**Files:**
- Modify: `src/core/browser-kernel-manager.ts`

- [x] **Step 1: Add Firefox kernels to list**

```ts
...await this.firefox.list()
```

- [x] **Step 2: Branch download by kernel id**

```ts
if (kernelId === 'firefox-latest') {
  return this.downloadFirefoxLatest(onProgress);
}
```

- [x] **Step 3: Download from Mozilla official endpoint**

```ts
const url = `https://archive.mozilla.org/pub/firefox/releases/${version}/win64/en-US/${fileName}`;
```

- [x] **Step 4: Extract to kernel directory**

```ts
await this.runCommand(installerPath, [
  `/ExtractDir=${targetDir}`
]);
```

### Task 3: Renderer Download Menu

**Files:**
- Modify: `src/renderer/src/components/layout/topbar.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`

- [x] **Step 1: Show downloadable kernels by source**

```ts
const kernelOptions = browserKernelOptions.filter((kernel) => kernel.id !== 'system-chrome' && kernel.id !== 'system-firefox');
```

- [x] **Step 2: Allow profile form download for `source: remote` options**

```ts
const canDownload = option.id !== 'system-chrome' && option.id !== 'system-firefox';
```

### Task 4: Verify

**Files:**
- No code files.

- [x] **Step 1: Typecheck**

Run: `.\node_modules\.bin\tsc.CMD -p tsconfig.main.json --noEmit`
Expected: exits 0.

Run: `.\node_modules\.bin\tsc.CMD -p tsconfig.renderer.json --noEmit`
Expected: exits 0.

- [x] **Step 2: Whitespace and line limits**

Run: `git diff --check`
Expected: exits 0.

Run line count check for touched files.
Expected: no touched code file exceeds 400 lines.
