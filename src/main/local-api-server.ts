import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import type {
  LaunchResult,
  ManagedExtension,
  ManagedExtensionUpdate,
  OpenApiInfo,
  OpenApiSettings,
  ProfileDetail,
  ProfileDraft,
  ProfileGroup,
  ProfileSummary,
  ProxyPoolItem
} from '../shared/types';
import {
  profileGroupMatches,
  toExtensionUpdate,
  toLaunchPayload,
  toManagedExtensionEngine,
  toProfileDraft,
  type JsonValue
} from './local-api-dto';

export interface OpenApiBrowserPort {
  readonly listProfiles: () => Promise<readonly ProfileSummary[]>;
  readonly getProfile: (profileId: string) => Promise<ProfileDetail>;
  readonly createProfile: (draft: ProfileDraft) => Promise<ProfileSummary>;
  readonly updateProfile: (profileId: string, draft: ProfileDraft) => Promise<ProfileSummary>;
  readonly launchProfile: (profileId: string) => Promise<LaunchResult>;
  readonly closeProfile: (profileId: string) => Promise<void>;
  readonly deleteProfile: (profileId: string) => Promise<void>;
}

export interface OpenApiExtensionPort {
  readonly list: () => Promise<readonly ManagedExtension[]>;
  readonly update: (extensionId: string, update: ManagedExtensionUpdate) => Promise<ManagedExtension>;
  readonly delete: (extensionId: string) => Promise<void>;
}

export interface LocalApiServerDependencies {
  readonly getSettings: () => Promise<OpenApiSettings>;
  readonly browser: OpenApiBrowserPort;
  readonly groups: { readonly list: () => Promise<readonly ProfileGroup[]> };
  readonly proxies: { readonly list: () => Promise<readonly ProxyPoolItem[]> };
  readonly extensions: OpenApiExtensionPort;
}

/** Electron 主进程内的本地 Open API 服务，只监听 127.0.0.1。 */
export class LocalApiServer {
  private server: Server | undefined;
  private activePort: number | undefined;

  public constructor(private readonly dependencies: LocalApiServerDependencies) {}

  /** 按当前设置启动 HTTP 服务；端口为 0 时由系统分配临时端口。 */
  public async start(): Promise<OpenApiInfo> {
    const settings = await this.dependencies.getSettings();
    if (this.server) {
      return this.toInfo(settings);
    }
    if (!settings.enabled) {
      return this.toInfo(settings);
    }

    this.server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(settings.port, '127.0.0.1', () => resolve());
    });
    this.activePort = getServerPort(this.server);
    return this.toInfo(settings);
  }

  /** 停止本地 Open API 服务，设置本身保持不变。 */
  public async stop(): Promise<OpenApiInfo> {
    const settings = await this.dependencies.getSettings();
    const current = this.server;
    this.server = undefined;
    this.activePort = undefined;
    if (current) {
      await new Promise<void>((resolve, reject) => {
        current.close((error) => error ? reject(error) : resolve());
      });
    }
    return this.toInfo(settings);
  }

  /** 返回当前服务状态，供自动化页面展示地址和 Key。 */
  public async getInfo(): Promise<OpenApiInfo> {
    return this.toInfo(await this.dependencies.getSettings());
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const settings = await this.dependencies.getSettings();
      if (!url.pathname.startsWith('/open-api')) {
        sendJson(response, 404, { error: '接口不存在' });
        return;
      }
      if (!isAuthorized(request, settings)) {
        sendJson(response, settings.enabled ? 401 : 403, { error: settings.enabled ? 'API Key 无效' : 'Open API 未启用' });
        return;
      }

      await this.dispatch(request, response, url);
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async dispatch(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    const method = request.method ?? 'GET';
    const segments = url.pathname.replace(/^\/open-api\/?/, '').split('/').filter(Boolean);

    if (method === 'GET' && segments.length === 1 && segments[0] === 'health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (method === 'GET' && segments.length === 1 && segments[0] === 'settings') {
      sendJson(response, 200, await this.getInfo());
      return;
    }
    if (method === 'GET' && segments.length === 1 && segments[0] === 'docs') {
      sendHtml(response, getDocsHtml());
      return;
    }
    if (segments[0] === 'profiles') {
      await this.handleProfiles(request, response, method, segments);
      return;
    }
    if (segments[0] === 'groups') {
      await this.handleGroups(response, method, segments);
      return;
    }
    if (method === 'GET' && segments.length === 1 && segments[0] === 'proxies') {
      sendJson(response, 200, await this.dependencies.proxies.list());
      return;
    }
    if (segments[0] === 'extensions') {
      await this.handleExtensions(request, response, method, segments, url);
      return;
    }

    sendJson(response, 404, { error: '接口不存在' });
  }

  private async handleProfiles(
    request: IncomingMessage,
    response: ServerResponse,
    method: string,
    segments: readonly string[]
  ): Promise<void> {
    if (method === 'GET' && segments.length === 1) {
      sendJson(response, 200, await this.dependencies.browser.listProfiles());
      return;
    }
    if (method === 'POST' && segments.length === 1) {
      const draft = toProfileDraft(await readJsonBody(request));
      sendJson(response, 200, await this.saveProfile(draft));
      return;
    }

    const profileId = decodeURIComponent(segments[1] ?? '');
    if (!profileId) {
      sendJson(response, 404, { error: 'Profile not found' });
      return;
    }
    if (method === 'GET' && segments.length === 2) {
      sendJson(response, 200, await this.dependencies.browser.getProfile(profileId));
      return;
    }
    if (method === 'DELETE' && segments.length === 2) {
      await this.dependencies.browser.deleteProfile(profileId);
      sendJson(response, 200, { ok: true });
      return;
    }
    if (method === 'POST' && segments.length === 3 && segments[2] === 'start') {
      sendJson(response, 200, toLaunchPayload(await this.dependencies.browser.launchProfile(profileId)));
      return;
    }
    if (method === 'POST' && segments.length === 3 && segments[2] === 'stop') {
      await this.dependencies.browser.closeProfile(profileId);
      sendJson(response, 200, { profileId, status: 'stopped' });
      return;
    }

    sendJson(response, 404, { error: '接口不存在' });
  }

  private async handleGroups(response: ServerResponse, method: string, segments: readonly string[]): Promise<void> {
    if (method === 'GET' && segments.length === 1) {
      sendJson(response, 200, await this.dependencies.groups.list());
      return;
    }
    const groupId = decodeURIComponent(segments[1] ?? '');
    if (method === 'POST' && segments.length === 3 && segments[2] === 'start') {
      sendJson(response, 200, await this.runGroupProfiles(groupId, 'start'));
      return;
    }
    if (method === 'POST' && segments.length === 3 && segments[2] === 'stop') {
      sendJson(response, 200, await this.runGroupProfiles(groupId, 'stop'));
      return;
    }
    sendJson(response, 404, { error: '接口不存在' });
  }

  private async handleExtensions(
    request: IncomingMessage,
    response: ServerResponse,
    method: string,
    segments: readonly string[],
    url: URL
  ): Promise<void> {
    if (method === 'GET' && segments.length === 1) {
      const engine = toManagedExtensionEngine(url.searchParams.get('engine'));
      const items = await this.dependencies.extensions.list();
      sendJson(response, 200, engine ? items.filter((item) => item.engine === engine) : items);
      return;
    }

    const extensionId = decodeURIComponent(segments[1] ?? '');
    if (method === 'PUT' && segments.length === 2) {
      sendJson(response, 200, await this.dependencies.extensions.update(extensionId, toExtensionUpdate(await readJsonBody(request))));
      return;
    }
    if (method === 'DELETE' && segments.length === 2) {
      await this.dependencies.extensions.delete(extensionId);
      sendJson(response, 200, { ok: true });
      return;
    }
    sendJson(response, 404, { error: '接口不存在' });
  }

  private async saveProfile(draft: ProfileDraft): Promise<ProfileSummary> {
    if (!draft.id) {
      return this.dependencies.browser.createProfile(draft);
    }
    try {
      await this.dependencies.browser.getProfile(draft.id);
      return this.dependencies.browser.updateProfile(draft.id, draft);
    } catch {
      return this.dependencies.browser.createProfile(draft);
    }
  }

  private async runGroupProfiles(groupId: string, action: 'start' | 'stop'): Promise<readonly JsonValue[]> {
    const profiles = await this.dependencies.browser.listProfiles();
    const selected = profiles.filter((profile) => profileGroupMatches(profile, groupId));
    const results: JsonValue[] = [];
    for (const profile of selected) {
      if (action === 'start') {
        results.push(toLaunchPayload(await this.dependencies.browser.launchProfile(profile.id)));
      } else {
        await this.dependencies.browser.closeProfile(profile.id);
        results.push({ profileId: profile.id, status: 'stopped' });
      }
    }
    return results;
  }

  private toInfo(settings: OpenApiSettings): OpenApiInfo {
    const port = this.activePort ?? settings.port;
    return {
      enabled: settings.enabled,
      running: Boolean(this.server),
      apiKey: settings.apiKey,
      port,
      baseUrl: `http://127.0.0.1:${port}/open-api`,
      docsUrl: `http://127.0.0.1:${port}/open-api/docs`
    };
  }
}

function isAuthorized(request: IncomingMessage, settings: OpenApiSettings): boolean {
  if (!settings.enabled) {
    return false;
  }
  const headerKey = getHeader(request, 'x-api-key').trim();
  const authorization = getHeader(request, 'authorization').trim();
  const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  return Boolean(settings.apiKey) && (headerKey === settings.apiKey || bearer === settings.apiKey);
}

function getHeader(request: IncomingMessage, name: string): string {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

async function readJsonBody(request: IncomingMessage): Promise<JsonValue | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) as JsonValue : undefined;
}

function sendJson<T>(response: ServerResponse, status: number, body: T): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, body: string): void {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(body);
}

function getServerPort(server: Server | undefined): number | undefined {
  const address = server?.address();
  return typeof address === 'object' && address ? address.port : undefined;
}

function getDocsHtml(): string {
  return '<!doctype html><meta charset="utf-8"><title>Open API Docs</title><h1>ImRun Open API</h1>';
}
