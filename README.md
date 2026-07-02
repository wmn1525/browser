# ImRun Browser

ImRun Browser 是一个基于 Electron、React 和 TypeScript 的本地指纹浏览器管理工具。应用通过 Electron 主进程管理浏览器 profile、代理池、浏览器内核与更新流程，renderer 只通过 preload 暴露的受控 API 调用本地能力。

## 功能概览

- 浏览器环境管理：创建、编辑、复制、导出、启动、关闭和删除 profile。
- 指纹参数配置：支持系统、User-Agent、Cookie、搜索引擎、启动页、标签、时区和常用指纹字段。
- 代理配置：支持 `http`、`https`、`socks5` 代理，并提供本地代理池管理入口。
- 浏览器内核：支持检测本机 Chrome，并下载指定版本的 Chrome for Testing。
- 应用更新：正式安装包启动后可通过 `electron-updater` 检查、下载和安装更新。
- 本地数据：profile 由 `@aitofy/browser-profiles` 管理，代理池保存到 Electron `userData` 目录。

## 技术栈

- Electron 31
- electron-vite
- React 18
- TypeScript 5
- Tailwind CSS
- Radix UI
- lucide-react
- @aitofy/browser-profiles

## 环境要求

- Node.js 20 或更高版本
- npm
- Windows 构建安装包时需要 Windows 环境

## 快速开始

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

类型检查：

```bash
npm run typecheck
```

构建产物：

```bash
npm run build
```

预览构建结果：

```bash
npm run start
```

构建 Windows 安装包：

```bash
npm run dist:win
```

构建 Apple Silicon Mac 安装包：

```bash
npm run dist:mac-arm64
```

安装包输出目录为 `release`。

Mac 安装包需要在 macOS 环境构建。当前命令面向 M 系列芯片，产物架构为 `arm64`。

## 目录结构

```text
resources/                 应用图标和构建资源
src/core/                  浏览器 profile 与浏览器内核管理
src/main/                  Electron 主进程、IPC、更新与本地存储
src/preload/               暴露给 renderer 的受控 API
src/renderer/              React 渲染进程
src/renderer/src/components 页面组件和 UI 组件
src/renderer/src/hooks     renderer 侧状态 hooks
src/shared/                main、preload 和 renderer 共用 DTO
```

## 关键模块

- `src/main/main.ts`：创建主窗口，注册 IPC 和应用更新逻辑。
- `src/main/ipc.ts`：集中注册 profile、代理池、网络、内核和窗口控制 IPC。
- `src/preload/preload.ts`：通过 `contextBridge` 暴露 `window.browserShell`。
- `src/core/browser-engine.ts`：封装 profile 生命周期、浏览器启动和运行状态监控。
- `src/core/browser-kernel-manager.ts`：检测本机 Chrome，下载并解析 Chrome for Testing 内核。
- `src/main/proxy-pool-store.ts`：将代理池保存到 Electron `userData/proxy-pool.json`。
- `src/renderer/src/App.tsx`：renderer 根组件，组织环境管理、功能页、弹窗和状态栏。

## 数据与缓存位置

- 代理池：Electron `userData/proxy-pool.json`。
- 浏览器内核：`~/.imrun-browser/kernels`。
- 下载中的内核压缩包：`~/.imrun-browser/kernels/downloads`。

## 发布配置

安装包由 `electron-builder` 生成，配置位于 `package.json` 的 `build` 字段：

- `appId`：`com.imrun.browser`
- `productName`：`ImRun Browser`
- Windows 安装包格式：NSIS
- Apple Silicon Mac 安装包格式：DMG、ZIP
- 更新源：`https://browser.im-run.com/publish/`

## CI 打包发布

- `Build Windows`：手动触发 Windows x64 打包，打包完成后上传 `release/*` 到 Cloudflare R2，并保存 GitHub artifact。
- `Build Mac`：手动触发 macOS arm64 打包，打包完成后上传 `release/*` 到 Cloudflare R2，并保存 GitHub artifact。
- `Publish Packages To R2`：手动触发或推送 `v*` 标签时，同时打 Windows x64 与 macOS arm64 包，并上传 `release/*` 到 Cloudflare R2。
- 手动触发时可填写 `version`，打包前会写入 `package.json`；推送 `v*` 标签时默认使用标签版本。
- R2 上传会跳过 `win-unpacked/`，并默认只保留最近 5 个版本文件，旧版本会自动清理。

R2 上传需要在 GitHub 仓库配置以下 Secrets：

- `CF_R2_ACCOUNT_ID`
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`
- `CF_R2_BUCKET`

可选配置仓库 Variable `CF_R2_PREFIX`，默认上传到 `publish/` 前缀。
可选配置仓库 Variable `R2_KEEP_RELEASES`，默认保留 5 个版本。

## 开发约定

- renderer 不直接访问 Node.js 能力，所有本地能力通过 preload API 调用。
- shared 类型用于稳定 main、preload 和 renderer 之间的数据契约。
- profile 运行状态由主进程维护，并通过 `profiles:changed` 通知 renderer 刷新。
- 应用更新在开发环境不会访问发布源，正式安装包启动后才自动检查。
