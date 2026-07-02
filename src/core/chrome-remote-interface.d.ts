/** 本项目只使用 CDP 的页面脚本注入能力，因此声明保持最小 API 面。 */
declare module 'chrome-remote-interface' {
  /** 连接本地 Chromium 调试端口需要的参数。 */
  export interface ChromeRemoteInterfaceOptions {
    readonly port: number;
  }

  /** CDP Page 域中用于新文档注入脚本的最小方法集合。 */
  export interface ChromeRemoteInterfacePageDomain {
    readonly enable: () => Promise<void>;
    readonly addScriptToEvaluateOnNewDocument: (options: { readonly source: string }) => Promise<void>;
  }

  /** CDP 客户端连接，用完后必须关闭，避免占用调试连接。 */
  export interface ChromeRemoteInterfaceClient {
    readonly Page: ChromeRemoteInterfacePageDomain;
    readonly close: () => Promise<void>;
  }

  export default function CDP(options: ChromeRemoteInterfaceOptions): Promise<ChromeRemoteInterfaceClient>;
}
