# Settings Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a settings center that helps users locate the current data directory and select a manually migrated directory for the next launch.

**Architecture:** Add a focused main-process settings store, expose it through IPC/preload, render a compact settings page through the existing feature routing, and apply configured data directory before business services load on next startup.

**Tech Stack:** Electron main/preload IPC, React, Ant Design, TypeScript, Node test scripts.

---

### Task 1: Settings Store

**Files:**
- Create: `src/main/app-settings-store.ts`
- Modify: `src/main/main.ts`
- Test: `scripts/test-settings-center.cjs`

- [ ] Write a failing Node test that mocks Electron `app`, loads `AppSettingsStore`, and checks default path, custom path, reset, and pending restart behavior.
- [ ] Implement `AppSettingsStore` with an external config file under `appData`.
- [ ] Apply the configured directory before dynamically importing browser services.

### Task 2: IPC And Preload

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/main/ipc.ts`
- Test: `scripts/test-settings-center.cjs`

- [ ] Add shared DTO/API methods for app settings.
- [ ] Add `app-settings:*` IPC handlers.
- [ ] Add preload methods on `window.browserShell`.

### Task 3: Settings UI And Navigation

**Files:**
- Create: `src/renderer/src/components/feature/settings-center-page.tsx`
- Modify: `src/renderer/src/components/feature/feature-page.tsx`
- Modify: `src/renderer/src/components/feature/feature-pages.ts`
- Modify: `src/renderer/src/components/layout/sidebar.tsx`
- Test: `scripts/test-settings-center.cjs`

- [ ] Add `settings` module key and sidebar item.
- [ ] Render `SettingsCenterPage` from `FeaturePage`.
- [ ] Show current path, next-start path, copy/open/select/reset actions, and restart-required state without automatic migration.

### Task 4: Verification

**Files:**
- Modify: `package.json`

- [ ] Add `test:settings-center`.
- [ ] Run `npm run test:settings-center`.
- [ ] Run `npm run test:automation`.
- [ ] Run `npm run test:open-api`.
- [ ] Run `npm run typecheck`.
