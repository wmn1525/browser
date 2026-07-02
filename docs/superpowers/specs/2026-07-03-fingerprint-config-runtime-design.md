# 指纹配置补齐与运行时生效设计

## 背景

当前应用已经提供 profile 表单、代理池、浏览器内核选择和基础指纹配置。现有指纹表单可保存平台、语言、时区、CPU、内存、屏幕尺寸、WebGL、Canvas、插件、DomRect、字体、电池、蓝牙和网络状态，但字段集合与 `my-fingerprint` 的标准配置相比仍不完整，运行时生效链路也没有把所有配置明确接入。

参考项目 `my-fingerprint` 的配置模型把指纹分为 `navigator`、`screen`、`normal`、`other` 四组，并使用 `default`、`value`、`page`、`browser`、`domain`、`global`、`enabled`、`disabled` 这些模式描述每个检测面的行为。参考功能包括 Canvas、WebGL、Audio、Fonts、WebRTC、WebGPU、DomRect、语言与时区、图形驱动、UserAgent、屏幕尺寸与分辨率。

## 目标

- 在本项目表单、DTO、保存链路中补齐参考项目的主要指纹配置项。
- Chromium 内核启动后通过现有 CDP 能力和补充 init script 让配置实际生效。
- Firefox 内核先通过 `user.js` 写入可稳定生效的偏好项，不承诺 JS 指纹随机扰动与 Chromium 完全一致。
- 保持现有 profile 存储兼容读取，不添加旧新结构转换壳或双写结构。
- 所有新增或修改文件保持 400 行以内，配置与运行时逻辑按职责拆分。

## 非目标

- 不复制 `my-fingerprint` 的扩展面板、订阅机制、白名单/黑名单页面和远程配置覆盖能力。
- 不在本次实现内打包独立浏览器扩展。
- 不承诺 Firefox 首版覆盖 Canvas、WebGL、Audio、Font、DomRect、WebGPU 的 JS 级随机扰动。
- 不新增云端同步、团队权限或远程模板市场。

## 数据结构

共享 DTO 使用业务含义清晰的字段，不使用 `any`、宽泛 `unknown` 或 `Record<string, unknown>`。

新增类型：

- `FingerprintHookMode`：`default`、`value`、`page`、`browser`、`domain`、`global`、`enabled`、`disabled`。
- `ClientHintsDraft`：保存 Chromium Client Hints 的平台、平台版本、架构、移动端标记和主版本。

扩展 `FingerprintDraft` 字段：

- `languages`：保存逗号输入后的语言列表。
- `screenColorDepth`、`screenPixelDepth`：补齐屏幕色深。
- `clientHintsMode`、`clientHintsPlatform`、`clientHintsPlatformVersion`、`clientHintsArchitecture`、`clientHintsMobile`、`clientHintsBrandVersion`。
- `audioMode`、`audioValue`。
- `webgpuMode`、`webgpuValue`。
- `webrtcMode`。
- `serviceWorkerMode`。

现有 `webglMode`、`canvasMode`、`rectsMode`、`fontsMode` 继续保存，但值域收敛到新的模式集合。现有旧值 `native` 在读取时不额外创建转换壳；表单回填时不在新选项中展示旧值，保存后自然写回新模式。

## UI 设计

`指纹信息` 页继续作为 profile 表单中的一个 Tab，按参考项目的强弱指纹组织：

- 基础身份：系统平台、接受语言、语言列表、时区。
- 设备与屏幕：CPU、内存、分辨率、屏幕色深。
- Client Hints 与显卡：Client Hints 模式和主要字段、GPU 预设、WebGL 厂商与渲染器。
- 强指纹：Canvas、WebGL、Audio、WebRTC、WebGPU、Fonts、DomRect、Service Worker。
- 连接与设备 API：电池、蓝牙、网络状态。

模式控件使用 `Select`，布尔开关语义使用 `enabled` / `disabled` 模式值，不新增独立临时字段。自定义值字段只在模式为 `value` 时表达人工输入；随机模式使用稳定随机值保存到对应 `Value` 字段，便于后续注入脚本根据 profile 重放。

## 运行时设计

Chromium：

- `normalizeProfileDraft` 将 UI 字段映射到 `@aitofy/browser-profiles` 支持的 `fingerprint` 字段，包括 `userAgent`、`language`、`screen`、`webgl`、`platform`、`hardwareConcurrency`、`deviceMemory`、`webrtc`、`canvas`、`audio`。
- 新增本项目自己的 Chromium 指纹脚本构建模块，补充核心库未覆盖或需要按 profile 配置控制的检测面：语言列表、屏幕色深、Client Hints、WebGPU、DomRect、Fonts、Service Worker。
- 启动后使用 CDP `Page.addScriptToEvaluateOnNewDocument` 注入补充脚本，并在已有启动监控前完成注入。

Firefox：

- `FirefoxLaunchProfile` 增加 `userAgent`、`timezone`、`fingerprint`、`loadImages`、`loadVideos`。
- `writeUserPrefs` 写入代理、UA、语言、时区、WebRTC、Service Worker、图片加载、自动播放等可稳定生效的偏好项。
- 不为 Firefox 的 Canvas、WebGL、Audio、Fonts、DomRect、WebGPU 构造弱保证脚本，避免给用户造成“已完整生效”的假象。

## 错误处理

- Chromium 补充脚本生成只接收已归一化的 profile 字段，缺失字段直接跳过对应检测面。
- CDP 注入失败时启动流程抛出明确错误，避免浏览器以未注入状态静默运行。
- Firefox 遇到不支持的带认证代理仍沿用现有错误行为。

## 测试与验证

- 新增或扩展脚本级测试，验证表单字段能进入 `ProfileDraft`。
- 新增核心映射测试，验证 DTO 归一化后映射到核心库支持的 fingerprint 字段。
- 新增脚本生成测试，验证 Chromium 补充脚本包含被配置的检测面且不包含未启用项。
- 运行 `npm run typecheck` 验证 main 与 renderer 类型正确。

## 参考

- `my-fingerprint` README：https://github.com/omegaee/my-fingerprint#features
- 标准配置模板：https://raw.githubusercontent.com/omegaee/my-fingerprint/main/example/config/template.json
- 配置类型定义：https://raw.githubusercontent.com/omegaee/my-fingerprint/main/src/types/storage.d.ts
