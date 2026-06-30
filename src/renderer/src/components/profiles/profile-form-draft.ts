import type { ProfileDetail, ProfileDraft, ProxyType } from '../../../../shared/types';

/** 将新建/编辑表单转换成核心引擎 DTO。 */
export function buildProfileDraft(form: FormData, initialProfile: ProfileDetail | undefined): ProfileDraft {
  const proxyHost = text(form.get('proxyHost'));
  const proxyPort = numberValue(form.get('proxyPort'));
  return {
    id: initialProfile ? undefined : text(form.get('id')),
    name: text(form.get('name')) ?? '',
    groupId: text(form.get('groupId')),
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
      hardwareConcurrency: numberValue(form.get('cpu')),
      deviceMemory: numberValue(form.get('memory')),
      screenWidth: numberValue(form.get('screenWidth')),
      screenHeight: numberValue(form.get('screenHeight')),
      webglVendor: text(form.get('webglVendor')),
      webglRenderer: text(form.get('webglRenderer'))
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

function lines(value: FormDataEntryValue | null): readonly string[] {
  return (text(value) ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function csv(value: FormDataEntryValue | null): readonly string[] {
  return (text(value) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}
