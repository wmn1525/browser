import type { ProfileDetail, ProfileDraft, ProfileSummary } from '../../shared/types';
import { filterProfilesByGroup } from './components/profiles/profile-groups';

/** 按当前分组、关键字和标签过滤 profile 列表。 */
export function getVisibleProfiles(
  profiles: readonly ProfileSummary[],
  activeGroupId: string,
  keyword: string,
  selectedTags: readonly string[]
): readonly ProfileSummary[] {
  const groupedProfiles = filterProfilesByGroup(profiles, activeGroupId);
  const normalizedKeyword = keyword.trim().toLowerCase();
  return groupedProfiles.filter((profile) => {
    const textMatch =
      normalizedKeyword.length === 0 ||
      profile.id.toLowerCase().includes(normalizedKeyword) ||
      profile.name.toLowerCase().includes(normalizedKeyword) ||
      profile.proxyLabel.toLowerCase().includes(normalizedKeyword);
    // 同一维度内多选取并集：勾中任一标签即保留，与常见筛选器的行为一致
    const tagMatch = selectedTags.length === 0 || selectedTags.some((tag) => profile.tags.includes(tag));
    return textMatch && tagMatch;
  });
}

/** 汇总所有环境已用过的标签，作为表单下拉候选，减少同义标签的重复变体。 */
export function getAllTags(profiles: readonly ProfileSummary[]): readonly string[] {
  return Array.from(new Set(profiles.flatMap((profile) => profile.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/** 复用详情字段生成更新 DTO，批量操作只覆盖本次需要修改的字段。 */
export function toProfileDraft(detail: ProfileDetail, overrides: Partial<ProfileDraft>): ProfileDraft {
  return {
    id: undefined,
    name: detail.name,
    accountName: detail.accountName,
    accountPlatform: detail.accountPlatform,
    browserKernel: detail.browserKernel,
    cookiesText: detail.cookiesText,
    groupId: detail.groupId,
    loadImages: detail.loadImages,
    loadVideos: detail.loadVideos,
    os: detail.os,
    osVersion: detail.osVersion,
    proxy: detail.proxy,
    searchEngine: detail.searchEngine,
    timezone: detail.timezone,
    userAgent: detail.userAgent,
    disabledGlobalExtensionIds: detail.disabledGlobalExtensionIds,
    fingerprint: detail.fingerprint,
    startUrls: detail.startUrls,
    tags: detail.tags,
    ...overrides
  };
}

export function normalizeGroupName(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getTopbarDescription(message: string): string {
  if (message.includes('同步')) return '同步入口已闭环为本地任务确认，后续可接入云同步。';
  return '顶部工具入口已闭环到可确认的操作面板。';
}

export function getTopbarItems(message: string): readonly string[] {
  if (message.includes('消息')) return ['系统消息', '任务失败提醒', '版本更新通知'];
  if (message.includes('同步')) return ['刷新本地 profile', '检查运行状态', '同步公网 IP 信息'];
  if (message.includes('通知')) return ['浏览器关闭提醒', '代理检测结果', '批量任务结果'];
  if (message.includes('账号')) return ['修改昵称', '团队权限', '操作日志'];
  return ['入口已响应', '当前不执行破坏性操作', '可继续接入后端能力'];
}
