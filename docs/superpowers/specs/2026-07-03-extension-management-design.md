# 应用中心扩展管理设计

## 目标

第一阶段只复刻 `Wtcity22/Open-Anti-Browser` 的扩展管理闭环，并落到当前项目的“应用中心”：

- 全局管理 Chrome/Chromium 与 Firefox 扩展。
- 支持导入扩展包或本地扩展文件夹。
- 支持启用、停用、删除扩展。
- 启动 profile 时自动挂载同内核且启用的全局扩展。
- 单个 profile 可以禁用指定全局扩展。

自动化 Open API 属于第二阶段，不进入本设计实现。

## 非目标

- 不实现扩展商店、远程下载、自动更新、评分、分类市场。
- 不实现 Profile 模板、启动页模板、脚本模板。
- 不新增旧字段兼容层或新旧 DTO 转换壳。
- 不为 Chromium 和 Firefox 做双写存储；扩展只保存一套统一业务模型。
- 不修改代理池、团队协作、同步器等无关模块。

## 参考行为

参考仓库的扩展管理能力包括：

- Chrome 扩展支持 `.zip`、`.crx` 上传，保存原文件并解包得到可加载目录。
- Firefox 扩展支持 `.xpi`、`.zip` 上传，最终以 `.xpi` 形式保存。
- 文件夹导入时会定位 `manifest.json`；Chrome 复制为可加载目录，Firefox 打包为 `.xpi`。
- 全局扩展有 `enabled` 状态；同内核 profile 启动时默认加载。
- profile 内维护 `disabled_global_extension_ids`，用于跳过某些全局扩展。

## 数据模型

在 `src/shared/types.ts` 新增窄类型：

- `ManagedExtensionEngine = 'chromium' | 'firefox'`
- `ManagedExtensionSource = 'package' | 'folder'`
- `ManagedExtension`
- `ManagedExtensionDraft`

`ManagedExtension` 字段：

- `id`
- `engine`
- `name`
- `source`
- `fileName`
- `storedPath`
- `unpackedPath`
- `effectivePath`
- `enabled`
- `exists`
- `createdAt`
- `updatedAt`

`ProfileDraft` 和 `ProfileDetail` 增加：

- `disabledGlobalExtensionIds: readonly string[]`

该字段表示当前 profile 禁用的全局扩展 id 列表。列表为空时，启用的全局扩展会按内核自动加载。

## 存储

新增主进程存储类：

- `src/main/managed-extension-store.ts`

存储位置：

- `app.getPath('userData')/managed-extensions.json`

扩展文件目录：

- `app.getPath('userData')/extensions/<engine>/<extensionId>/`

存储类只负责读写列表。导入、解包、路径验证、删除目录由独立服务负责，避免单文件职责膨胀。

## 扩展导入服务

新增核心工具：

- `src/core/extension-manager.ts`

职责：

- 校验 engine 与文件后缀。
- Chrome `.zip/.crx` 解包并安全展开。
- Firefox `.xpi` 直接保存，`.zip` 重命名为 `.xpi`。
- 文件夹导入时查找唯一 `manifest.json`。
- Chrome 文件夹复制到 `unpacked`。
- Firefox 文件夹打包成 `.xpi`。
- 删除扩展目录。

约束：

- ZIP 解压必须防止路径穿越。
- `.crx` 只提取 ZIP payload，不实现签名校验。
- 目录中多个 `manifest.json` 时要求用户选择更具体目录。

## IPC 与 Preload

扩展 `BrowserShellApi`：

- `listManagedExtensions()`
- `importManagedExtensionPackage(engine, name)`
- `importManagedExtensionFolder(engine, name)`
- `updateManagedExtension(extensionId, draft)`
- `deleteManagedExtension(extensionId)`

Electron 主进程使用 `dialog.showOpenDialog`：

- 包导入选择文件，不让 renderer 直接读取文件内容。
- 文件夹导入选择目录。

IPC 返回稳定 DTO，不暴露 Node 内部对象。

## 启动挂载

Chromium：

- `BrowserEngine.launchProfile` 在启动前读取扩展列表。
- 收集 `engine === 'chromium'`、`enabled === true`、`exists === true` 且未被当前 profile 禁用的扩展。
- 将目录路径传入 Chromium 启动参数：
  - `--disable-extensions-except=<paths>`
  - `--load-extension=<paths>`

Firefox：

- `FirefoxProfileLauncher` 接收扩展 `.xpi` 路径列表。
- 启动前复制到当前 Firefox profile 目录的 `extensions` 子目录。
- Firefox 扩展文件名优先从 manifest 的 gecko id 获取；没有 id 时使用原文件名。
- 同步写入必要 prefs，允许 profile 启动时扫描扩展。

## 应用中心页面

替换当前 `apps` 占位页为真实扩展管理页：

- 左侧：选择内核、填写显示名、导入扩展包、导入文件夹。
- 右侧：按内核筛选的扩展列表。
- 每个扩展展示名称、文件名、来源、有效路径、存在状态、启用状态。
- 操作：启用/停用、删除。

仍保留“应用中心”导航入口，不新增独立顶层菜单。

## Profile 表单

`AppsTab` 增加全局扩展禁用区：

- 按当前选择的浏览器内核展示同内核扩展。
- 默认不勾选禁用项。
- 用户勾选后写入 `disabledGlobalExtensionIds`。

如果当前 profile 选择 Firefox 内核，只展示 Firefox 扩展；Chromium 同理。

## 错误处理

- 不支持的文件格式返回清晰错误。
- 文件或文件夹不存在时返回清晰错误。
- 删除扩展后同步清理所有 profile 的禁用列表。
- 启动时扩展文件丢失则跳过该扩展，并在扩展列表中显示 `exists: false`。
- 导入失败不写入扩展列表。

## 验证

新增脚本级检查：

- Chrome zip 解包时能找到 `manifest.json`。
- CRX payload 提取逻辑能从 mock CRX 中得到 zip。
- ZIP 解压拒绝路径穿越。
- Firefox 文件夹能打包为 `.xpi`。
- 删除扩展会清理 profile 禁用列表。
- Chromium 启动参数包含启用且未禁用扩展路径。

运行验证：

- `npm run typecheck`
- 新增扩展管理专项脚本
- 现有 profile 表单和表格 UI 检查

## 交付边界

本阶段完成后，用户可以在应用中心导入并管理本地扩展，启动 profile 时自动加载对应内核扩展，并能在单个 profile 中禁用指定全局扩展。

第二阶段再实现自动化 Open API，包括 API Key、本地 HTTP 服务、接口文档页和外部自动化调用。
