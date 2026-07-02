import type { FingerprintHookMode, ProfileDetail, ProfileDraft, ProxyType } from '../../../../shared/types';

/** 将新建/编辑表单转换成核心引擎 DTO。 */
export function buildProfileDraft(form: FormData, initialProfile: ProfileDetail | undefined): ProfileDraft {
  const proxyHost = text(form.get('proxyHost'));
  const proxyPort = numberValue(form.get('proxyPort'));
  return {
    id: initialProfile ? undefined : text(form.get('id')),
    name: text(form.get('name')) ?? '',
    groupId: groupIdValue(form.get('groupId')),
    browserKernel: text(form.get('browserKernel')),
    os: text(form.get('os')),
    osVersion: text(form.get('osVersion')),
    userAgent: text(form.get('userAgent')),
    cookiesText: text(form.get('cookiesText')),
    searchEngine: text(form.get('searchEngine')),
    accountPlatform: text(form.get('accountPlatform')),
    accountName: text(form.get('accountName')),
    loadImages: form.get('loadImages') !== null,
    loadVideos: form.get('loadVideos') !== null,
    proxy: proxyHost && proxyPort ? {
      type: (text(form.get('proxyType')) ?? 'http') as ProxyType,
      host: proxyHost,
      port: proxyPort,
      username: text(form.get('proxyUser')),
      password: text(form.get('proxyPass'))
    } : undefined,
    timezone: text(form.get('timezone')),
    fingerprint: {
      platform: text(form.get('platform')),
      language: text(form.get('language')),
      languages: text(form.get('languages')),
      hardwareConcurrency: numberValue(form.get('cpu')),
      deviceMemory: numberValue(form.get('memory')),
      screenWidth: numberValue(form.get('screenWidth')),
      screenHeight: numberValue(form.get('screenHeight')),
      screenColorDepth: numberValue(form.get('screenColorDepth')),
      screenPixelDepth: numberValue(form.get('screenPixelDepth')),
      webglVendor: text(form.get('webglVendor')),
      webglRenderer: text(form.get('webglRenderer')),
      hstsMode: hookMode(form.get('hstsMode')),
      hstsValue: text(form.get('hstsValue')),
      webglMode: hookMode(form.get('webglMode')),
      webglValue: text(form.get('webglValue')),
      canvasMode: hookMode(form.get('canvasMode')),
      canvasValue: text(form.get('canvasValue')),
      pluginsMode: hookMode(form.get('pluginsMode')),
      pluginsValue: text(form.get('pluginsValue')),
      rectsMode: hookMode(form.get('rectsMode')),
      rectsValue: text(form.get('rectsValue')),
      fontsMode: hookMode(form.get('fontsMode')),
      fontsValue: text(form.get('fontsValue')),
      clientHintsMode: hookMode(form.get('clientHintsMode')),
      clientHintsPlatform: text(form.get('clientHintsPlatform')),
      clientHintsPlatformVersion: text(form.get('clientHintsPlatformVersion')),
      clientHintsArchitecture: text(form.get('clientHintsArchitecture')),
      clientHintsMobile: booleanText(form.get('clientHintsMobile')),
      clientHintsBrandVersion: text(form.get('clientHintsBrandVersion')),
      audioMode: hookMode(form.get('audioMode')),
      audioValue: text(form.get('audioValue')),
      webgpuMode: hookMode(form.get('webgpuMode')),
      webgpuValue: text(form.get('webgpuValue')),
      webrtcMode: hookMode(form.get('webrtcMode')),
      serviceWorkerMode: hookMode(form.get('serviceWorkerMode')),
      batteryState: text(form.get('batteryState')),
      bluetoothState: text(form.get('bluetoothState')),
      networkState: text(form.get('networkState'))
    },
    startUrls: lines(form.get('urls')),
    tags: csv(form.get('tags'))
  };
}

function text(value: FormDataEntryValue | null): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : undefined;
}

function numberValue(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number.parseInt(text(value) ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function booleanText(value: FormDataEntryValue | null): boolean | undefined {
  const normalized = text(value);
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return undefined;
}

function hookMode(value: FormDataEntryValue | null): FingerprintHookMode | undefined {
  const normalized = text(value);
  switch (normalized) {
    case 'default':
    case 'value':
    case 'page':
    case 'browser':
    case 'domain':
    case 'global':
    case 'enabled':
    case 'disabled':
      return normalized;
    default:
      return undefined;
  }
}

function groupIdValue(value: FormDataEntryValue | null): string | undefined {
  const normalized = text(value);
  return normalized === 'ungrouped' || normalized === '未分组' ? undefined : normalized;
}

function lines(value: FormDataEntryValue | null): readonly string[] {
  return (text(value) ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function csv(value: FormDataEntryValue | null): readonly string[] {
  return (text(value) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}
