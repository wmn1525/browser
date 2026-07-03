# Automation Subpages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在自动化模块下增加 `API&MCP` 和 `窗口同步` 两个二级页，并让 API 文档可一键复制。

**Architecture:** Renderer 增加 `AutomationPage` 作为二级导航容器，`OpenApiPage` 负责 API&MCP 上下布局，`WindowSyncPage` 负责窗口同步操作台。Main 侧增加 `WindowSyncService`，通过 Chromium CDP 连接主控和跟随窗口。

**Tech Stack:** Electron IPC、React、Ant Design、chrome-remote-interface、Node 静态/服务测试。

---

### Task 1: Failing Tests

**Files:**
- Create: `scripts/test-automation-subpages-ui.cjs`
- Create: `scripts/test-window-sync-service.cjs`
- Modify: `package.json`

- [ ] 写 UI 静态检查，覆盖 `AutomationPage`、`API&MCP`、`窗口同步`、API 文档复制和 preload/IPC 暴露点。
- [ ] 写窗口同步服务测试，使用 fake connector 验证启动、事件分发、停止和不支持窗口拒绝。
- [ ] 运行 `npm run test:automation`，确认失败原因是生产代码缺失。

### Task 2: API&MCP Page

**Files:**
- Create: `src/renderer/src/components/feature/open-api-docs.ts`
- Modify: `src/renderer/src/components/feature/open-api-page.tsx`

- [ ] 拆出 endpoint 文档和 Markdown 文档构造函数。
- [ ] 把页面改成上方控制区、下方文档区。
- [ ] 增加 `copyDocumentation`，复制完整 API 和 MCP 文档。
- [ ] 运行 `npm run test:automation`，确认 API&MCP 相关断言通过。

### Task 3: Window Sync Service

**Files:**
- Create: `src/main/window-sync-service.ts`
- Create: `src/main/window-sync-cdp.ts`
- Create: `src/main/window-sync-script.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/core/browser-engine.ts`
- Modify: `src/main/browser-services.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/core/chrome-remote-interface.d.ts`

- [ ] 增加窗口同步 DTO 和 BrowserShell API。
- [ ] 让 `BrowserEngine` 暴露运行窗口的调试端口和同步支持状态。
- [ ] 实现 `WindowSyncService`，由 fake connector 测试驱动。
- [ ] 实现 Chromium CDP connector，注入主控采集脚本并向跟随窗口执行同步事件。
- [ ] 运行 `npm run test:automation`，确认服务测试通过。

### Task 4: Window Sync UI

**Files:**
- Create: `src/renderer/src/components/feature/automation-page.tsx`
- Create: `src/renderer/src/components/feature/window-sync-page.tsx`
- Modify: `src/renderer/src/components/feature/feature-page.tsx`

- [ ] `AutomationPage` 使用分段控制切换 `API&MCP` 与 `窗口同步`。
- [ ] `WindowSyncPage` 展示运行窗口、主控、跟随、同步选项和会话状态。
- [ ] 接入 `listWindowSyncProfiles`、`startWindowSync`、`stopWindowSync`、`restartWindowSync`。
- [ ] 运行 `npm run test:automation`，确认 UI 检查通过。

### Task 5: Verification

- [ ] 运行 `npm run test:open-api`。
- [ ] 运行 `npm run test:automation`。
- [ ] 运行 `npm run test:managed-extensions`。
- [ ] 运行 `npm run test:profile-table-ui`。
- [ ] 运行 `npm run test:topbar-ui`。
- [ ] 运行 `npm run typecheck`。
- [ ] 检查新增和修改后的源码文件不超过 400 行。
