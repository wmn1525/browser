import type {
  LaunchResult,
  ManagedExtensionEngine,
  ManagedExtensionUpdate,
  ProfileDraft,
  ProfileSummary,
  ProxyType
} from '../shared/types';

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

/** 将 Open API 请求体转换为当前项目的 profile DTO。 */
export function toProfileDraft(value: JsonValue | undefined): ProfileDraft {
  const body = asObject(value);
  return {
    id: text(body.id),
    name: text(body.name) ?? '',
    groupId: text(body.groupId) ?? text(body.group),
    browserKernel: text(body.browserKernel) ?? engineToKernel(text(body.engine)),
    os: text(body.os),
    osVersion: text(body.osVersion),
    userAgent: text(body.userAgent),
    cookiesText: text(body.cookiesText),
    searchEngine: text(body.searchEngine),
    accountPlatform: text(body.accountPlatform),
    accountName: text(body.accountName),
    loadImages: booleanValue(body.loadImages),
    loadVideos: booleanValue(body.loadVideos),
    proxy: proxyDraft(body.proxy),
    timezone: text(body.timezone),
    disabledGlobalExtensionIds: stringArray(body.disabledGlobalExtensionIds),
    startUrls: stringArray(body.startUrls),
    tags: stringArray(body.tags)
  };
}

/** 扩展更新接口只接受显示名和启用状态。 */
export function toExtensionUpdate(value: JsonValue | undefined): ManagedExtensionUpdate {
  const body = asObject(value);
  return {
    name: text(body.name),
    enabled: booleanValue(body.enabled)
  };
}

/** 把内部启动结果补成外部自动化脚本常用字段。 */
export function toLaunchPayload(result: LaunchResult): JsonObject {
  const port = result.port ?? result.debugPort;
  return {
    profileId: result.profileId,
    wsEndpoint: result.wsEndpoint ?? null,
    port: port ?? null,
    debug_port: result.debugPort ?? port ?? null,
    debug_url: result.debugUrl ?? (port ? `http://127.0.0.1:${port}` : null)
  };
}

/** `_ungrouped_` 兼容外部脚本表达未分组 profile。 */
export function profileGroupMatches(profile: ProfileSummary, groupId: string): boolean {
  if (groupId === '_ungrouped_') {
    return !profile.groupId;
  }
  return profile.groupId === groupId;
}

/** API 兼容 chrome 写法，内部统一使用 chromium。 */
export function toManagedExtensionEngine(value: string | null): ManagedExtensionEngine | undefined {
  if (value === 'firefox') {
    return 'firefox';
  }
  if (value === 'chrome' || value === 'chromium') {
    return 'chromium';
  }
  return undefined;
}

function proxyDraft(value: JsonValue | undefined): ProfileDraft['proxy'] {
  const body = objectOrUndefined(value);
  if (!body) {
    return undefined;
  }
  const host = text(body.host);
  const port = numberValue(body.port);
  if (!host || !port) {
    return undefined;
  }
  return {
    type: proxyType(text(body.type)),
    host,
    port,
    username: text(body.username),
    password: text(body.password)
  };
}

function engineToKernel(value: string | undefined): string | undefined {
  if (value === 'firefox') {
    return 'system-firefox';
  }
  if (value === 'chrome' || value === 'chromium') {
    return 'system-chrome';
  }
  return undefined;
}

function proxyType(value: string | undefined): ProxyType {
  return value === 'https' || value === 'socks5' ? value : 'http';
}

function asObject(value: JsonValue | undefined): JsonObject {
  return objectOrUndefined(value) ?? {};
}

function objectOrUndefined(value: JsonValue | undefined): JsonObject | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as JsonObject;
}

function text(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: JsonValue | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function booleanValue(value: JsonValue | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stringArray(value: JsonValue | undefined): readonly string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => typeof item === 'string' && item.trim() ? [item.trim()] : [])
    : [];
}
