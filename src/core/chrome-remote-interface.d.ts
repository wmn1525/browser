/** 本项目只使用 CDP 的页面脚本注入能力，因此声明保持最小 API 面。 */
declare module 'chrome-remote-interface' {
  /** 连接本地 Chromium 调试端口需要的参数。 */
  export interface ChromeRemoteInterfaceOptions {
    readonly port: number;
  }

  /** CDP Runtime.evaluate 当前只需要执行脚本，不读取返回值。 */
  export interface ChromeRemoteInterfaceEvaluateOptions {
    readonly expression: string;
    readonly awaitPromise?: boolean;
    readonly returnByValue?: boolean;
  }

  /** CDP console 事件参数，窗口同步只读取字符串 value。 */
  export interface ChromeRemoteInterfaceRemoteObject {
    readonly value?: string | number | boolean | null;
  }

  /** Runtime.consoleAPICalled 事件的最小结构。 */
  export interface ChromeRemoteInterfaceConsoleEvent {
    readonly args: readonly ChromeRemoteInterfaceRemoteObject[];
  }

  /** Runtime.evaluate 返回值的最小结构。 */
  export interface ChromeRemoteInterfaceEvaluateResult {
    readonly result: ChromeRemoteInterfaceRemoteObject;
  }

  /** CDP Page 域中用于新文档注入脚本的最小方法集合。 */
  export interface ChromeRemoteInterfacePageDomain {
    readonly enable: () => Promise<void>;
    readonly addScriptToEvaluateOnNewDocument: (options: { readonly source: string }) => Promise<void>;
    readonly navigate: (options: { readonly url: string }) => Promise<void>;
  }

  /** CDP Runtime 域用于注入当前页面脚本和监听 console 事件。 */
  export interface ChromeRemoteInterfaceRuntimeDomain {
    readonly enable: () => Promise<void>;
    readonly evaluate: (options: ChromeRemoteInterfaceEvaluateOptions) => Promise<ChromeRemoteInterfaceEvaluateResult>;
    readonly consoleAPICalled: (listener: (event: ChromeRemoteInterfaceConsoleEvent) => void) => void;
  }

  /** CDP 客户端连接，用完后必须关闭，避免占用调试连接。 */
  export interface ChromeRemoteInterfaceClient {
    readonly Page: ChromeRemoteInterfacePageDomain;
    readonly Runtime: ChromeRemoteInterfaceRuntimeDomain;
    readonly close: () => Promise<void>;
  }

  export default function CDP(options: ChromeRemoteInterfaceOptions): Promise<ChromeRemoteInterfaceClient>;
}
