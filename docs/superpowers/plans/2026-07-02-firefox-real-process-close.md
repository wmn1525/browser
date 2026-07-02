# Firefox Real Process Close Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firefox profile 关闭时能找到真实 `firefox.exe` 进程并关闭整棵进程树。

**Architecture:** 生命周期管理仍在 `FirefoxProfileLauncher` 内，进程匹配逻辑拆到独立模块。自动化控制不进入本次修改，后续通过单独 Provider 接 WebDriver BiDi。

**Tech Stack:** Electron main、TypeScript、`find-process`、`tree-kill`。

---

### Task 1: Firefox Process Matching

**Files:**
- Create: `src/core/firefox-process.ts`
- Create: `scripts/test-firefox-process.cjs`

- [ ] **Step 1: 写失败检查**

```js
const assert = require('node:assert/strict');
const { normalizeProcessPath, isFirefoxProfileProcess } = require('../dist/core/firefox-process');

const profileDir = 'C:\\Users\\me\\.imrun-browser\\firefox-profiles\\abc';
assert.equal(normalizeProcessPath(`${profileDir}\\prefs.js`), 'c:/users/me/.imrun-browser/firefox-profiles/abc/prefs.js');
assert.equal(isFirefoxProfileProcess({ pid: 1, name: 'firefox.exe', cmd: `"C:\\Firefox\\firefox.exe" -profile "${profileDir}"` }, profileDir), true);
assert.equal(isFirefoxProfileProcess({ pid: 2, name: 'chrome.exe', cmd: profileDir }, profileDir), false);
```

- [ ] **Step 2: 运行检查确认失败**

Run: `node scripts/test-firefox-process.cjs`
Expected: FAIL because `dist/core/firefox-process` does not exist.

- [ ] **Step 3: 实现最小匹配模块**

Create `src/core/firefox-process.ts` with typed helpers for path normalization and Firefox command-line matching.

- [ ] **Step 4: 构建后运行检查确认通过**

Run: `.\node_modules\.bin\tsc.CMD -p tsconfig.main.json --outDir dist`
Run: `node scripts/test-firefox-process.cjs`
Expected: PASS.

### Task 2: Launcher Lifecycle

**Files:**
- Modify: `src/core/firefox-profile-launcher.ts`
- Modify: `src/core/browser-engine.ts`

- [ ] **Step 1: 写 launcher 最小改动**

Store `profileId -> profileDir/pid/timer` sessions, scan real Firefox processes after spawn, and use `tree-kill` on close.

- [ ] **Step 2: 类型检查**

Run: `.\node_modules\.bin\tsc.CMD -p tsconfig.main.json --noEmit`
Expected: PASS.

- [ ] **Step 3: 渲染层回归检查**

Run: `.\node_modules\.bin\tsc.CMD -p tsconfig.renderer.json --noEmit`
Expected: PASS.
