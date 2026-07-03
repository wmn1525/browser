import type { WindowSyncOptions, WindowSyncProfile } from '../shared/window-sync-types';

/** 主进程内部使用的同步事件类型，和注入脚本上报的 type 保持一致。 */
export type WindowSyncEventType = 'navigate' | 'click' | 'input' | 'change' | 'scroll' | 'keydown' | 'mouseMove';

/** 鼠标和键盘事件共享的修饰键状态。 */
export interface WindowSyncModifierPayload {
  /** Ctrl 是否按下。 */
  readonly ctrlKey: boolean;
  /** Shift 是否按下。 */
  readonly shiftKey: boolean;
  /** Alt 是否按下。 */
  readonly altKey: boolean;
  /** Meta/Command 是否按下。 */
  readonly metaKey: boolean;
}

/** 主控窗口上报的页面跳转事件。 */
export interface WindowSyncNavigatePayload {
  /** 需要同步到跟随窗口的完整 URL。 */
  readonly url: string;
}

/** 主控窗口上报的点击事件。 */
export interface WindowSyncClickPayload extends WindowSyncModifierPayload {
  /** 尽量稳定的目标元素选择器。 */
  readonly selector: string;
  /** 主控窗口内的横向坐标。 */
  readonly x: number;
  /** 主控窗口内的纵向坐标。 */
  readonly y: number;
  /** 横向相对位置，选择器失效时用于兜住点击点。 */
  readonly rx: number;
  /** 纵向相对位置，选择器失效时用于兜住点击点。 */
  readonly ry: number;
  /** DOM MouseEvent button 值。 */
  readonly button: number;
}

/** 主控窗口上报的输入变化事件。 */
export interface WindowSyncInputPayload {
  /** 目标输入元素选择器。 */
  readonly selector: string;
  /** 目标元素标签名。 */
  readonly tag: string;
  /** 输入框类型，例如 text、checkbox。 */
  readonly inputType: string;
  /** 文本或可编辑内容。 */
  readonly value: string;
  /** checkbox/radio 的勾选状态。 */
  readonly checked: boolean | null;
}

/** 主控窗口上报的滚动事件。 */
export interface WindowSyncScrollPayload {
  /** 滚动目标类型，window 表示页面，element 表示局部元素。 */
  readonly mode: 'window' | 'element';
  /** 局部滚动元素选择器。 */
  readonly selector?: string;
  /** 页面横向滚动像素。 */
  readonly x?: number;
  /** 页面纵向滚动像素。 */
  readonly y?: number;
  /** 横向滚动比例。 */
  readonly ratioX?: number;
  /** 纵向滚动比例。 */
  readonly ratioY?: number;
  /** 局部元素横向滚动像素。 */
  readonly scrollLeft?: number;
  /** 局部元素纵向滚动像素。 */
  readonly scrollTop?: number;
}

/** 主控窗口上报的键盘事件。 */
export interface WindowSyncKeyboardPayload extends WindowSyncModifierPayload {
  /** 当前聚焦元素选择器。 */
  readonly selector: string;
  /** KeyboardEvent.key。 */
  readonly key: string;
  /** KeyboardEvent.code。 */
  readonly code: string;
}

/** 主控窗口上报的鼠标移动事件。 */
export interface WindowSyncMouseMovePayload {
  /** 主控窗口内的横向坐标。 */
  readonly x: number;
  /** 主控窗口内的纵向坐标。 */
  readonly y: number;
  /** 横向相对位置。 */
  readonly rx: number;
  /** 纵向相对位置。 */
  readonly ry: number;
}

/** 注入脚本上报给主进程的标准同步事件基类。 */
interface WindowSyncEventBase<Type extends WindowSyncEventType, Payload> {
  /** 同步事件类型。 */
  readonly type: Type;
  /** 主控窗口事件发生时的页面地址。 */
  readonly href: string;
  /** 事件发生时间，来自浏览器页面 Date.now。 */
  readonly ts: number;
  /** 各事件类型对应的结构化载荷。 */
  readonly payload: Payload;
}

/** 注入脚本上报给主进程的标准同步事件。 */
export type WindowSyncCapturedEvent =
  | WindowSyncEventBase<'navigate', WindowSyncNavigatePayload>
  | WindowSyncEventBase<'click', WindowSyncClickPayload>
  | WindowSyncEventBase<'input', WindowSyncInputPayload>
  | WindowSyncEventBase<'change', WindowSyncInputPayload>
  | WindowSyncEventBase<'scroll', WindowSyncScrollPayload>
  | WindowSyncEventBase<'keydown', WindowSyncKeyboardPayload>
  | WindowSyncEventBase<'mouseMove', WindowSyncMouseMovePayload>;

/** 已连接的页面客户端，服务层只关心应用事件和关闭连接。 */
export interface WindowSyncPageClient {
  /** 连接对应的 profile id。 */
  readonly profileId: string;
  /** 把主控事件应用到该页面。 */
  readonly apply: (event: WindowSyncCapturedEvent, options: WindowSyncOptions) => Promise<void>;
  /** 主控页面当前 URL，仅主控连接需要实现。 */
  readonly getCurrentUrl?: () => Promise<string>;
  /** 释放 CDP 或测试 fake 连接。 */
  readonly close: () => Promise<void>;
}

/** 连接器隔离真实 CDP 连接，方便服务层使用 fake connector 测试。 */
export interface WindowSyncConnector {
  /** 连接主控页面并注册事件回调。 */
  readonly connectMaster: (
    profile: WindowSyncProfile,
    onEvent: (event: WindowSyncCapturedEvent) => void
  ) => Promise<WindowSyncPageClient>;
  /** 连接跟随页面。 */
  readonly connectFollower: (profile: WindowSyncProfile) => Promise<WindowSyncPageClient>;
}
