# Antd UI 原生替换设计

## 目标

将渲染端现有 `components/ui` 自定义 UI 与 Radix/shadcn 风格依赖全部替换为 Ant Design 原生组件引用，不保留旧 API 适配层。

## 范围

- `src/renderer/src/components/ui/*` 的调用点改为直接从 `antd` 导入组件或 API。
- 删除不再使用的 `components/ui` 文件与 Radix UI、`class-variance-authority`、`tailwind-merge` 依赖。
- 保留 Tailwind 作为页面布局、间距、业务视觉细节工具。
- 保留 `lucide-react` 图标依赖，图标不是旧 UI 组件适配层。

## 组件映射

- `Button`、`Input`、`Textarea`、`Checkbox`、`Switch` 使用 antd 同名组件。
- `Select` 使用 antd `Select`，选项改为 `options` 或 `Select.Option`。
- `Dialog` 改为 antd `Modal`。
- `DropdownMenu` 改为 antd `Dropdown`，普通菜单使用 `MenuProps['items']`，复杂内容下拉使用 `popupRender`。
- `Tabs` 改为 antd `Tabs`。
- `Tooltip` 改为 antd `Tooltip`。
- `Badge` 改为 antd `Tag` 或 `Badge`，按展示语义选择。
- `Table` 基础结构优先使用 antd `Table`；若当前行结构迁移成本过高，可先使用原生 `table` 加 antd 控件，但不得继续依赖 `components/ui/table`。
- `ToastProvider`、`useToast` 改为 antd `message`。
- `Separator` 改为 antd `Divider`。

## 约束

- 不新增兼容层、双写路径或旧新组件转换壳。
- 单个修改后文件不得超过 400 行。
- 修改保持外科手术式，避免重写无关业务逻辑。
- 新增或修改的复杂逻辑保留中文注释说明意图。

## 验证

- 运行 `npm run typecheck` 验证 TypeScript。
- 运行 `npm run build` 验证打包。
- 若迁移影响现有脚本覆盖的页面，再运行对应 `scripts/test-*.cjs`。
