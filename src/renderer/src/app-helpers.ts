import type { ProfileDetail, ProfileDraft, ProfileGroup, ProfileSummary } from '../../shared/types';
import { filterProfilesByGroup } from './components/profiles/profile-groups';

/** 按当前分组、关键字和标签过滤 profile 列表。 */
export function getVisibleProfiles(
  profiles: readonly ProfileSummary[],
  activeGroupId: string,
  keyword: string,
  tagKeyword: string
): readonly ProfileSummary[] {
  const groupedProfiles = filterProfilesByGroup(profiles, activeGroupId);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedTag = tagKeyword.trim().toLowerCase();
  return groupedProfiles.filter((profile) => {
    const textMatch =
      normalizedKeyword.length === 0 ||
      profile.id.toLowerCase().includes(normalizedKeyword) ||
      profile.name.toLowerCase().includes(normalizedKeyword) ||
      profile.proxyLabel.toLowerCase().includes(normalizedKeyword);
    const tagMatch =
      normalizedTag.length === 0 ||
      profile.tags.some((tag) => tag.toLowerCase().includes(normalizedTag));
    return textMatch && tagMatch;
  });
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

export function getBatchGroupPrompt(groups: readonly ProfileGroup[]): string {
  const names = groups.map((group) => group.name).join('、') || '暂无分组';
  return `请输入目标分组名称，输入“未分组”可移出分组。\n可选分组：${names}`;
}

/** 解析批量分组输入，避免把不存在的分组名写入 profile。 */
export function resolvePromptGroupId(value: string | null, groups: readonly ProfileGroup[]): {
  readonly cancelled: boolean;
  readonly groupId?: string;
} {
  const name = normalizeGroupName(value);
  if (!name) {
    return { cancelled: true };
  }
  if (name === '未分组') {
    return { cancelled: false, groupId: undefined };
  }

  const group = groups.find((item) => item.name === name);
  return group ? { cancelled: false, groupId: group.id } : { cancelled: true };
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

export function getFilterItems(message: string): readonly string[] {
  if (message.includes('列设置')) return ['编号列', '代理列', '标签列', '备注列', '操作列'];
  if (message.includes('收藏')) return ['收藏视图已响应', '后续可持久化收藏筛选', '不会修改 profile 数据'];
  return ['请先勾选环境', '可使用批量工具条执行删除', '删除会弹出确认框'];
}
