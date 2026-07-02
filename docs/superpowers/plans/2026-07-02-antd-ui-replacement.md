# Antd UI Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace renderer UI usage with native Ant Design components and remove the old `components/ui` layer.

**Architecture:** The renderer will import interactive UI controls directly from `antd`. Tailwind remains responsible for layout and page-specific spacing, while Ant Design owns controls, overlays, menus, tabs, messages, and form widgets.

**Tech Stack:** Electron, React 18, TypeScript, Tailwind CSS, Ant Design.

---

## File Structure

- Modify `package.json` and lockfiles to add `antd` and remove unused Radix/shadcn dependencies.
- Modify `src/renderer/src/main.tsx` to load Ant Design reset styles.
- Modify `src/renderer/src/App.tsx` to remove old providers.
- Modify renderer components that import `../ui/*` or `./components/ui/*`.
- Delete `src/renderer/src/components/ui/*` after imports are gone.
- Modify `src/renderer/src/lib/utils.ts` only if `cn` becomes unused.

## Tasks

### Task 1: Dependencies and Entry Styles

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/renderer/src/main.tsx`

- [ ] Install Ant Design with `npm install antd`.
- [ ] Remove unused dependencies after code migration with `npm uninstall @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-tooltip class-variance-authority tailwind-merge`.
- [ ] Add `import 'antd/dist/reset.css';` in `src/renderer/src/main.tsx` before local `styles.css`.
- [ ] Run `npm run typecheck`; expected failure is unresolved old UI imports until later tasks finish.

### Task 2: App Providers and Toast

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/feature/proxy-pool-page.tsx`

- [ ] Remove `ToastProvider` and `TooltipProvider` imports and JSX wrappers from `App.tsx`.
- [ ] In `proxy-pool-page.tsx`, replace `useToast` with antd `message`.
- [ ] Keep the existing success/error message text unchanged.

### Task 3: Layout Components

**Files:**
- Modify: `src/renderer/src/components/layout/topbar.tsx`
- Modify: `src/renderer/src/components/layout/sidebar.tsx`
- Modify: `src/renderer/src/components/layout/pagination.tsx`
- Modify: `src/renderer/src/components/layout/app-update-dialog.tsx`
- Modify: `src/renderer/src/components/layout/window-titlebar.tsx`

- [ ] Replace old `Button`, `Input`, `Select`, `DropdownMenu`, and `Dialog` imports with antd components.
- [ ] Convert `DropdownMenu` usage to antd `Dropdown` and `MenuProps['items']`.
- [ ] Convert app update dialog to antd `Modal`.
- [ ] Preserve existing callback behavior and visible text.

### Task 4: Profile Components

**Files:**
- Modify: `src/renderer/src/components/profiles/filterbar.tsx`
- Modify: `src/renderer/src/components/profiles/batch-toolbar.tsx`
- Modify: `src/renderer/src/components/profiles/profile-table.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-page.tsx`
- Modify: `src/renderer/src/components/profiles/profile-form-fields.tsx`
- Modify: `src/renderer/src/components/profiles/profile-proxy-tab.tsx`
- Modify: `src/renderer/src/components/profiles/profile-fingerprint-tab.tsx`

- [ ] Replace form controls with antd `Input`, `Input.TextArea`, `Select`, `Checkbox`, `Switch`, `Button`, `Tabs`, `Tooltip`, and `Tag`.
- [ ] Convert profile row action menu to antd `Dropdown`.
- [ ] Preserve hidden form field names used by `FormData`.
- [ ] Keep files under 400 lines; split only if a touched file crosses the limit.

### Task 5: Feature Components

**Files:**
- Modify: `src/renderer/src/app-dialogs.tsx`
- Modify: `src/renderer/src/components/feature/feature-page.tsx`
- Modify: `src/renderer/src/components/feature/local-groups-page.tsx`
- Modify: `src/renderer/src/components/feature/proxy-pool-dialog.tsx`
- Modify: `src/renderer/src/components/feature/proxy-pool-table.tsx`
- Modify: `src/renderer/src/components/feature/proxy-pool-page.tsx`

- [ ] Replace dialogs with antd `Modal`.
- [ ] Replace tags and badges with antd `Tag`.
- [ ] Replace table checkboxes and action buttons with antd controls.
- [ ] Convert native status select in proxy pool page to antd `Select`.

### Task 6: Remove Old UI Layer

**Files:**
- Delete: `src/renderer/src/components/ui/*`
- Modify: `src/renderer/src/lib/utils.ts` if unused

- [ ] Run `rg "components/ui|../ui|./components/ui|@radix-ui|class-variance-authority|tailwind-merge|useToast|ToastProvider|TooltipProvider" src package.json`.
- [ ] Delete old UI component files once the search returns no required imports.
- [ ] Remove `src/renderer/src/lib/utils.ts` only if no file imports `cn`.

### Task 7: Verification

**Files:**
- No source changes expected.

- [ ] Run `npm run typecheck`; expected exit code `0`.
- [ ] Run `npm run build`; expected exit code `0`.
- [ ] Run line-count check for modified source files; no touched code file may exceed 400 lines.
