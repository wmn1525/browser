/** 窗口同步模块在 main、preload 和 renderer 之间共享的稳定 DTO。 */

/** 窗口同步支持的事件范围，字段名直接对应 renderer 的开关状态。 */
export interface WindowSyncOptions {
  /** 是否同步页面跳转和地址变化。 */
  readonly syncNavigation: boolean;
  /** 是否同步点击动作。 */
  readonly syncClick: boolean;
  /** 是否同步输入框、文本域、下拉框和可编辑文本变化。 */
  readonly syncInput: boolean;
  /** 是否同步窗口和可滚动元素的滚动位置。 */
  readonly syncScroll: boolean;
  /** 是否同步 Enter、Tab、Escape 和组合键。 */
  readonly syncKeyboard: boolean;
  /** 是否同步鼠标移动轨迹，用于跟随窗口可视化光标。 */
  readonly syncMouseMove: boolean;
  /** 启动同步时是否立即把主控当前网址同步给跟随窗口。 */
  readonly syncCurrentUrlOnStart: boolean;
}

/** 自动化页展示的运行窗口同步状态，只有带 Chromium 调试端口的窗口可同步。 */
export interface WindowSyncProfile {
  /** Profile 唯一 id。 */
  readonly id: string;
  /** Profile 展示名称。 */
  readonly name: string;
  /** 所属本地分组 id，未分组时为空。 */
  readonly groupId?: string;
  /** 当前浏览器窗口是否仍在运行。 */
  readonly isRunning: boolean;
  /** 当前窗口是否具备 CDP 同步所需的调试端口。 */
  readonly syncSupported: boolean;
  /** Chromium 调试端口。 */
  readonly debugPort?: number;
  /** Chromium 调试 HTTP 地址。 */
  readonly debugUrl?: string;
  /** Chromium DevTools WebSocket 地址。 */
  readonly wsEndpoint?: string;
}

/** 启动或重启窗口同步时 renderer 提交的稳定请求体。 */
export interface WindowSyncStartRequest {
  /** 采集事件的主控 profile。 */
  readonly masterProfileId: string;
  /** 接收事件的跟随 profile 列表。 */
  readonly followerProfileIds: readonly string[];
  /** 本次同步会话启用的事件范围。 */
  readonly options: WindowSyncOptions;
}

/** 最近一次同步事件摘要，用于操作台展示和排查。 */
export interface WindowSyncLastEvent {
  /** 最近事件类型。 */
  readonly type: string;
  /** 最近事件的简短说明。 */
  readonly summary: string;
  /** 最近事件时间戳。 */
  readonly at: string;
}

/** 当前窗口同步会话状态，主进程是唯一可信来源。 */
export interface WindowSyncSession {
  /** 同步会话是否正在运行。 */
  readonly running: boolean;
  /** 当前主控 profile id。 */
  readonly masterProfileId?: string;
  /** 当前跟随 profile id 列表。 */
  readonly followerProfileIds: readonly string[];
  /** 已连接的跟随窗口数量。 */
  readonly connectedFollowers: number;
  /** 会话启动时间。 */
  readonly startedAt?: string;
  /** 最近一次同步事件。 */
  readonly lastEvent?: WindowSyncLastEvent;
  /** 最近一次连接或同步错误。 */
  readonly lastError?: string;
  /** 当前会话使用的同步选项。 */
  readonly options?: WindowSyncOptions;
}
