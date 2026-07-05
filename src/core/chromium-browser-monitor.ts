/** 浏览器关闭回调只暴露 profileId，避免监控器依赖业务状态结构。 */
export type BrowserClosedHandler = (profileId: string) => void;

/** Chromium CDP 端口监控器，用于发现用户从浏览器窗口直接关闭的实例。 */
export class ChromiumBrowserMonitor {
  private readonly monitors = new Map<string, ReturnType<typeof setInterval>>();

  /** 启动指定 profile 的 CDP 存活探测，连续失败后通知调用方清理运行态。 */
  public start(profileId: string, port: number, onClosed: BrowserClosedHandler): void {
    this.stop(profileId);

    let failedChecks = 0;
    const timer = setInterval(() => {
      void this.checkBrowserAlive(port).then((isAlive) => {
        if (isAlive) {
          failedChecks = 0;
          return;
        }

        failedChecks += 1;
        if (failedChecks >= 2) {
          onClosed(profileId);
        }
      });
    }, 2000);

    this.monitors.set(profileId, timer);
  }

  /** 停止指定 profile 的运行态探测器。 */
  public stop(profileId: string): void {
    const timer = this.monitors.get(profileId);
    if (!timer) {
      return;
    }

    clearInterval(timer);
    this.monitors.delete(profileId);
  }

  /** 访问 Chrome debug endpoint，失败通常意味着用户已关闭浏览器。 */
  private async checkBrowserAlive(port: number): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: controller.signal
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
