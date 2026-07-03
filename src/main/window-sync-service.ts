import type {
  WindowSyncLastEvent,
  WindowSyncOptions,
  WindowSyncProfile,
  WindowSyncSession,
  WindowSyncStartRequest
} from '../shared/window-sync-types';
import { CdpWindowSyncConnector } from './window-sync-cdp';
import type { WindowSyncCapturedEvent, WindowSyncConnector, WindowSyncEventType, WindowSyncPageClient } from './window-sync-types';

/** 窗口同步服务依赖，listProfiles 由 BrowserEngine 提供，connector 可在测试中替换。 */
export interface WindowSyncServiceDependencies {
  /** 返回当前运行窗口及其 CDP 支持状态。 */
  readonly listProfiles: () => Promise<readonly WindowSyncProfile[]>;
  /** 真实或测试用页面连接器。 */
  readonly connector?: WindowSyncConnector;
}

const emptySession: WindowSyncSession = {
  running: false,
  followerProfileIds: [],
  connectedFollowers: 0
};

/** 默认同步范围对齐 Open-Anti-Browser 同步器的常用开关。 */
export const defaultWindowSyncOptions: WindowSyncOptions = {
  syncNavigation: true,
  syncClick: true,
  syncInput: true,
  syncScroll: true,
  syncKeyboard: true,
  syncMouseMove: true,
  syncCurrentUrlOnStart: true
};

/** 管理一个窗口同步会话，负责校验窗口、连接页面和分发同步事件。 */
export class WindowSyncService {
  private readonly connector: WindowSyncConnector;
  private readonly followerClients = new Map<string, WindowSyncPageClient>();
  private masterClient?: WindowSyncPageClient;
  private session: WindowSyncSession = emptySession;

  public constructor(private readonly dependencies: WindowSyncServiceDependencies) {
    this.connector = dependencies.connector ?? new CdpWindowSyncConnector();
  }

  /** 返回可展示在窗口同步页的运行窗口列表。 */
  public async listProfiles(): Promise<readonly WindowSyncProfile[]> {
    return this.dependencies.listProfiles();
  }

  /** 返回当前同步会话快照，避免 renderer 自行推断运行态。 */
  public getSession(): WindowSyncSession {
    return this.session;
  }

  /** 启动新会话；已有会话会先关闭，防止同一窗口重复绑定 CDP 事件。 */
  public async start(request: WindowSyncStartRequest): Promise<WindowSyncSession> {
    const profiles = await this.dependencies.listProfiles();
    const selected = this.resolveProfiles(profiles, request);
    await this.stop();

    try {
      for (const profile of selected.followers) {
        const client = await this.connector.connectFollower(profile);
        this.followerClients.set(profile.id, client);
      }

      this.masterClient = await this.connector.connectMaster(selected.master, (event) => {
        void this.dispatchEvent(event);
      });
      this.session = {
        running: true,
        masterProfileId: selected.master.id,
        followerProfileIds: selected.followers.map((profile) => profile.id),
        connectedFollowers: this.followerClients.size,
        startedAt: new Date().toISOString(),
        options: request.options
      };
      if (request.options.syncCurrentUrlOnStart) {
        await this.syncCurrentUrlOnStart();
      }
      return this.session;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  /** 停止当前会话并释放所有主控和跟随窗口连接。 */
  public async stop(): Promise<WindowSyncSession> {
    const clients = [...this.followerClients.values(), this.masterClient].filter(
      (client): client is WindowSyncPageClient => Boolean(client)
    );
    this.followerClients.clear();
    this.masterClient = undefined;

    for (const client of clients) {
      await client.close();
    }

    this.session = emptySession;
    return this.session;
  }

  /** 用新的请求体重启同步，会重新校验窗口和选项。 */
  public async restart(request: WindowSyncStartRequest): Promise<WindowSyncSession> {
    await this.stop();
    return this.start(request);
  }

  /** 把主控事件分发给所有跟随窗口，并更新最近事件摘要。 */
  private async dispatchEvent(event: WindowSyncCapturedEvent): Promise<void> {
    const options = this.session.options;
    if (!this.session.running || !options || !shouldSyncEvent(event.type, options)) {
      return;
    }

    this.session = {
      ...this.session,
      lastEvent: summarizeEvent(event),
      connectedFollowers: this.followerClients.size
    };

    try {
      await Promise.all([...this.followerClients.values()].map((client) => client.apply(event, options)));
    } catch (error) {
      this.session = {
        ...this.session,
        lastError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /** 启动时主动读取主控当前地址，让跟随窗口先对齐页面。 */
  private async syncCurrentUrlOnStart(): Promise<void> {
    const url = await this.masterClient?.getCurrentUrl?.();
    if (!url) {
      return;
    }

    await this.dispatchEvent({
      type: 'navigate',
      href: url,
      ts: Date.now(),
      payload: { url }
    });
  }

  /** 按请求体解析主控和跟随窗口，并拒绝未运行或不支持 CDP 的窗口。 */
  private resolveProfiles(
    profiles: readonly WindowSyncProfile[],
    request: WindowSyncStartRequest
  ): { readonly master: WindowSyncProfile; readonly followers: readonly WindowSyncProfile[] } {
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const master = profileMap.get(request.masterProfileId);
    if (!master) {
      throw new Error(`主控窗口不存在: ${request.masterProfileId}`);
    }

    const followerIds = [...new Set(request.followerProfileIds)].filter((id) => id !== request.masterProfileId);
    if (followerIds.length === 0) {
      throw new Error('请至少选择 1 个跟随窗口');
    }

    const followers = followerIds.map((id) => {
      const profile = profileMap.get(id);
      if (!profile) {
        throw new Error(`跟随窗口不存在: ${id}`);
      }
      return profile;
    });

    for (const profile of [master, ...followers]) {
      validateSyncProfile(profile);
    }

    return { master, followers };
  }
}

function validateSyncProfile(profile: WindowSyncProfile): void {
  if (!profile.isRunning) {
    throw new Error(`窗口未运行: ${profile.name}`);
  }
  if (!profile.syncSupported) {
    throw new Error(`窗口不支持窗口同步: ${profile.name}`);
  }
}

function shouldSyncEvent(type: WindowSyncEventType, options: WindowSyncOptions): boolean {
  if (type === 'navigate') return options.syncNavigation;
  if (type === 'click') return options.syncClick;
  if (type === 'input' || type === 'change') return options.syncInput;
  if (type === 'scroll') return options.syncScroll;
  if (type === 'keydown') return options.syncKeyboard;
  return options.syncMouseMove;
}

function summarizeEvent(event: WindowSyncCapturedEvent): WindowSyncLastEvent {
  return {
    type: event.type,
    summary: summarizePayload(event),
    at: new Date().toISOString()
  };
}

function summarizePayload(event: WindowSyncCapturedEvent): string {
  if (event.type === 'navigate') return event.payload.url;
  if (event.type === 'click' || event.type === 'input' || event.type === 'change') return event.payload.selector;
  if (event.type === 'keydown') return event.payload.key;
  if (event.type === 'scroll') return event.payload.mode;
  return `${Math.round(event.payload.x)}, ${Math.round(event.payload.y)}`;
}
