# 后台托盘常驻与 Firefox/Gecko 内核支持设计

## 背景

当前客户端是 Electron 管理壳，关闭最后一个窗口后会在 Windows/Linux 上直接退出应用。浏览器内核管理只覆盖本机 Chrome 与 Chrome for Testing，profile 启动链路依赖 `@aitofy/browser-profiles` 的 Chromium/Puppeteer 能力。

本次目标有两个：客户端关闭主窗口后继续后台常驻，并新增真实 Firefox/Gecko 浏览器进程启动能力。

## 范围

- 关闭主窗口时隐藏到系统托盘，进程继续运行。
- 托盘右键菜单提供“打开主窗口”和“退出应用”。
- 新增本机 Firefox 内核选项，启动真实 Firefox/Gecko 进程。
- Firefox profile 使用独立用户数据目录，避免污染系统默认 Firefox 配置。
- Firefox 首版支持启动页和代理基础参数。
- 现有 Chrome 内核下载、启动、运行状态逻辑保持原行为。

## 非目标

- 不实现 Firefox 自动下载。
- 不把 Chrome for Testing 下载逻辑改造成多内核下载器。
- 不伪装成 Firefox UA 来替代真实 Gecko。
- 不承诺 Firefox 首版具备 Chromium CDP 指纹注入同等能力。

## 后台常驻设计

`src/main/main.ts` 持有主窗口和托盘实例。主窗口收到 `close` 事件时，如果不是显式退出，则阻止默认关闭并调用 `hide()`。托盘图标复用现有应用图标。

托盘菜单包含：

- 打开主窗口：显示已有窗口并聚焦；如果窗口已销毁则重新创建。
- 退出应用：设置显式退出标记后调用 `app.quit()`。

`window-all-closed` 不再触发普通退出，真正退出只来自托盘菜单或系统显式退出路径。

## Firefox/Gecko 设计

共享类型 `BrowserKernelInfo` 增加 `engine: 'chromium' | 'firefox'` 字段。现有 Chrome 选项标记为 `chromium`，新增 `system-firefox` 标记为 `firefox`。

`BrowserKernelManager` 负责检测本机 Firefox 路径：

- Windows：检查常见安装路径和 `ProgramFiles`、`ProgramFiles(x86)`。
- macOS：检查 `/Applications/Firefox.app/...`。
- Linux：检查常见命令路径。

`BrowserEngine.launchProfile` 根据选中内核分流：

- Chromium：继续调用 `@aitofy/browser-profiles.launchByIdOrName`。
- Firefox：调用新的 Firefox 启动器，使用 `spawn` 启动 Firefox 可执行文件，并传入独立 profile 目录、启动页和代理参数。

Firefox 运行状态通过子进程退出事件维护，不复用 Chrome 的 CDP HTTP 探测。

## 数据与目录

Firefox profile 目录位于 `~/.imrun-browser/firefox-profiles/<profileId>`。该目录只服务本应用启动的 Firefox 实例，不承载 Chrome profile 数据迁移。

现有 `browserKernel` 字段继续保存内核 ID。未设置或未知内核时仍回落到 `system-chrome`。

## 错误处理

- 选择 `system-firefox` 但未检测到 Firefox 时，启动时报错并提示安装 Firefox。
- Firefox 进程启动失败时，不标记 profile 为运行中。
- 关闭 Firefox profile 时优先终止本应用持有的子进程；如果进程已自然退出，只清理运行态。

## 验证

- 运行 `pnpm typecheck` 验证 main、preload、renderer 类型契约。
- 启动开发环境后验证关闭窗口进入托盘，托盘“打开主窗口”可恢复窗口，托盘“退出应用”可结束进程。
- 在已安装 Firefox 的机器上创建或编辑 profile 选择“本机 Firefox”，启动后确认打开的是真实 Firefox 进程。
- 验证 Chrome profile 仍可使用原有内核启动与关闭。
