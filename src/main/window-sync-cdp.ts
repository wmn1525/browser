import CDP from 'chrome-remote-interface';

import type { WindowSyncOptions, WindowSyncProfile } from '../shared/window-sync-types';
import { buildFollowerExpression, WINDOW_SYNC_MASTER_SCRIPT, WINDOW_SYNC_PREFIX } from './window-sync-script';
import type { WindowSyncCapturedEvent, WindowSyncConnector, WindowSyncPageClient } from './window-sync-types';

/** 基于 Chromium CDP 的窗口同步连接器，只处理具备 debugPort 的运行窗口。 */
export class CdpWindowSyncConnector implements WindowSyncConnector {
  /** 连接主控窗口，注入采集脚本并监听 console 上报事件。 */
  public async connectMaster(
    profile: WindowSyncProfile,
    onEvent: (event: WindowSyncCapturedEvent) => void
  ): Promise<WindowSyncPageClient> {
    const client = await connectProfile(profile);
    await client.Runtime.enable();
    await client.Page.enable();
    client.Runtime.consoleAPICalled((event) => {
      for (const arg of event.args) {
        if (typeof arg.value !== 'string' || !arg.value.startsWith(WINDOW_SYNC_PREFIX)) {
          continue;
        }
        const syncEvent = parseSyncEvent(arg.value.slice(WINDOW_SYNC_PREFIX.length));
        if (syncEvent) {
          onEvent(syncEvent);
        }
      }
    });
    await client.Page.addScriptToEvaluateOnNewDocument({ source: WINDOW_SYNC_MASTER_SCRIPT });
    await client.Runtime.evaluate({ expression: WINDOW_SYNC_MASTER_SCRIPT, awaitPromise: false });
    return new CdpWindowSyncPageClient(profile.id, client);
  }

  /** 连接跟随窗口，等待服务层把主控事件应用过来。 */
  public async connectFollower(profile: WindowSyncProfile): Promise<WindowSyncPageClient> {
    const client = await connectProfile(profile);
    await client.Runtime.enable();
    await client.Page.enable();
    return new CdpWindowSyncPageClient(profile.id, client);
  }
}

/** 封装单个 CDP 页面连接，确保服务层不用了解 Runtime/Page 细节。 */
class CdpWindowSyncPageClient implements WindowSyncPageClient {
  public constructor(
    public readonly profileId: string,
    private readonly client: Awaited<ReturnType<typeof CDP>>
  ) {}

  /** 根据事件类型执行导航或页面脚本。 */
  public async apply(event: WindowSyncCapturedEvent, _options: WindowSyncOptions): Promise<void> {
    if (event.type === 'navigate') {
      await this.client.Page.navigate({ url: event.payload.url });
      return;
    }

    await this.client.Runtime.evaluate({
      expression: buildFollowerExpression(event),
      awaitPromise: false
    });
  }

  /** 读取当前页面 URL，用于启动同步时对齐跟随窗口。 */
  public async getCurrentUrl(): Promise<string> {
    const result = await this.client.Runtime.evaluate({
      expression: 'location.href',
      awaitPromise: false,
      returnByValue: true
    });
    return typeof result.result.value === 'string' ? result.result.value : '';
  }

  /** 关闭 CDP 连接，避免调试端口被长期占用。 */
  public async close(): Promise<void> {
    await this.client.close();
  }
}

async function connectProfile(profile: WindowSyncProfile): Promise<Awaited<ReturnType<typeof CDP>>> {
  if (!profile.debugPort) {
    throw new Error(`窗口缺少调试端口: ${profile.name}`);
  }
  return CDP({ port: profile.debugPort });
}

function parseSyncEvent(value: string): WindowSyncCapturedEvent | undefined {
  try {
    const event: WindowSyncCapturedEvent = JSON.parse(value);
    if (!isSupportedEventType(event.type)) {
      return undefined;
    }
    return event;
  } catch {
    return undefined;
  }
}

function isSupportedEventType(value: string): value is WindowSyncCapturedEvent['type'] {
  return ['navigate', 'click', 'input', 'change', 'scroll', 'keydown', 'mouseMove'].includes(value);
}
