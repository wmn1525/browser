# Local Profile Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成纯本地 profile 分组闭环。

**Architecture:** 主进程提供 `profile-groups.json` 本地存储 IPC；共享 DTO 暴露分组和 profile 的 `groupId`；renderer 在 App 状态中组合分组、筛选、表单、批量移动和分组管理页。

**Tech Stack:** Electron IPC、React、TypeScript、Radix UI、Node.js 脚本测试。

---

### Task 1: 本地分组模型与测试

**Files:**
- Create: `src/renderer/src/components/profiles/profile-groups.ts`
- Create: `scripts/test-local-profile-groups.cjs`
- Modify: `src/shared/types.ts`
- Modify: `src/core/profile-dto-mapper.ts`

- [ ] **Step 1: Write failing tests**

运行 `node scripts/test-local-profile-groups.cjs`，期望因目标文件不存在失败。

- [ ] **Step 2: Implement group helpers**

新增分组 ID、显示名称、计数、筛选与删除检查的纯函数。

- [ ] **Step 3: Expose profile group DTO**

共享类型新增 `ProfileGroup`，`ProfileSummary` 新增 `groupId`，mapper 填充 `groupId`。

- [ ] **Step 4: Run tests**

运行 `node scripts/test-local-profile-groups.cjs` 和 `npm run typecheck`。

### Task 2: 主进程本地存储与 preload API

**Files:**
- Create: `src/main/profile-group-store.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add local store**

用 Electron `userData/profile-groups.json` 保存完整分组数组。

- [ ] **Step 2: Add IPC and preload methods**

新增 `groups:list` 与 `groups:save`，renderer 通过 `window.browserShell` 调用。

- [ ] **Step 3: Run typecheck**

运行 `npm run typecheck`。

### Task 3: Renderer 分组闭环

**Files:**
- Create: `src/renderer/src/components/feature/local-groups-page.tsx`
- Create: `src/renderer/src/app-dialogs.tsx`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/feature/feature-page.tsx`
- Modify: `src/renderer/src/components/profiles/filterbar.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-page.tsx`
- Modify: `src/renderer/src/components/profiles/profile-table.tsx`

- [ ] **Step 1: Split App dialogs**

把 `FeatureDialog` 和 `PreviewDialog` 移到独立文件，确保 `App.tsx` 修改后不超过 400 行。

- [ ] **Step 2: Wire groups state**

App 读取和保存本地分组，表格、筛选栏、表单和分组页共享同一组数据。

- [ ] **Step 3: Implement batch move**

批量分组使用现有 `updateProfile` 更新选中 profile 的 `groupId`。

- [ ] **Step 4: Run verification**

运行 `node scripts/test-local-profile-groups.cjs`、`npm run typecheck`，并检查修改文件行数不超过 400 行。
