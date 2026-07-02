# Local Profile Groups Design

## 目标

把 profile 分组从占位入口完善为纯本地功能：用户可以在本机创建、重命名、删除空分组，把 profile 移动到分组，并按分组查看或筛选 profile。

## 范围

- 分组数据保存到 Electron `userData` 下的本地 JSON 文件。
- profile 继续只保存 `groupId`，不新增云端、团队或远程 API 能力。
- “未分组”不作为持久化分组，只由缺失 `groupId` 表示。
- 删除分组只允许删除空分组，避免隐式迁移 profile。

## 架构

主进程新增本地分组存储，与代理池存储保持同类模式：renderer 读取完整分组列表，完成增删改计算后保存完整列表。共享 DTO 新增 `ProfileGroup`，`ProfileSummary` 暴露 `groupId`，使表格和筛选无需再读取详情。

renderer 维护 `groups`、`activeGroupId` 与 profile 列表状态。分组管理页使用真实分组数据；环境管理页的筛选栏、表格、批量分组和 profile 表单都从同一份本地分组列表渲染。

## 验证

- 新增本地分组纯函数测试，覆盖创建 ID、显示名称、计数、筛选和删除空分组限制。
- 运行 `npm run typecheck` 验证主进程、preload、renderer 类型链路。
