# 设置中心设计

## 目标

新增一个设置中心，先暴露数据文件夹设置。用户可以查看当前数据目录、复制路径、打开文件夹；如果后期手动迁移了数据文件夹，也可以选择迁移后的目录，并看到是否需要重启后生效。

## 设计

设置中心作为左侧导航的一级模块接入，不改 `App.tsx` 根组件。页面由 `SettingsCenterPage` 承载，调用 preload 暴露的设置 API。

数据目录设置由主进程的 `AppSettingsStore` 管理。配置文件独立保存在 Electron `appData` 下，不放在当前 `userData` 内，避免用户切换数据目录后无法再读取配置。运行中选择目录只保存配置，不迁移已有数据；下次启动时主进程先读取配置并设置 Electron `userData/sessionData`，再加载业务服务。

## 验证

新增 `test:settings-center`，覆盖配置 store、IPC/preload API、导航入口和页面源码。完成后运行设置中心测试、已有自动化/Open API 测试和 typecheck。
