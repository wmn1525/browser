# Kernel Download Menu Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将顶部“下载内核”弹窗改成 Firefox/Gecko 与 Chrome/Chromium 分组展示，降低列表混乱感。

**Architecture:** 保持现有下载 API 和状态模型不变，只调整 renderer 顶部菜单展示。下载菜单继续接收 `kernels`、`kernelProgress` 和 `onDownloadKernel`，按 `engine` 分组渲染。

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react.

---

## File Structure

- Modify: `src/renderer/src/components/layout/topbar.tsx`，按内核引擎分组下载菜单。

### Task 1: Group Download Menu

**Files:**
- Modify: `src/renderer/src/components/layout/topbar.tsx`

- [x] **Step 1: Split options by engine**

```ts
const downloadableOptions = browserKernelOptions.filter((kernel) => kernel.id !== 'system-chrome' && kernel.id !== 'system-firefox');
const firefoxOptions = downloadableOptions.filter((kernel) => kernel.engine === 'firefox');
const chromeOptions = downloadableOptions.filter((kernel) => kernel.engine === 'chromium');
```

- [x] **Step 2: Render group headers**

```tsx
<KernelDownloadGroup title="Firefox / Gecko" options={firefoxOptions} />
<KernelDownloadGroup title="Chrome / Chromium" options={chromeOptions} />
```

- [x] **Step 3: Keep row status consistent**

```tsx
{installed ? <span>已下载</span> : downloading ? <Progress /> : <Button>下载</Button>}
```

### Task 2: Verify

**Files:**
- No code files.

- [x] **Step 1: Typecheck renderer**

Run: `.\node_modules\.bin\tsc.CMD -p tsconfig.renderer.json --noEmit`
Expected: exits 0.

- [x] **Step 2: Whitespace and line limits**

Run: `git diff --check`
Expected: exits 0.

Run line count check.
Expected: no touched code file exceeds 400 lines.
