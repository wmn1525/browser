import type { ProfileGroup, ProfileSummary } from '../../../../shared/types';

export type ProfileGroupFilter = 'all' | 'ungrouped' | string;

/** 创建本地分组，ID 只服务于本机 profile 归类，不参与远程同步。 */
export function createLocalGroup(name: string): ProfileGroup {
  return {
    id: `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim()
  };
}

/** 返回表格可显示的分组名称，缺失分组时直接展示原始 ID 便于用户发现数据问题。 */
export function getGroupLabel(groups: readonly ProfileGroup[], groupId: string | undefined): string {
  if (!groupId) {
    return '未分组';
  }

  return groups.find((group) => group.id === groupId)?.name ?? groupId;
}

/** 统计每个本地分组下的 profile 数量，供分组管理页判断删除约束。 */
export function countProfilesByGroup(
  groups: readonly ProfileGroup[],
  profiles: readonly ProfileSummary[]
): readonly { readonly group: ProfileGroup; readonly count: number }[] {
  return groups.map((group) => ({
    group,
    count: profiles.filter((profile) => profile.groupId === group.id).length
  }));
}

/** 按分组筛选 profile；all 和 ungrouped 是 UI 层约定的非持久化筛选值。 */
export function filterProfilesByGroup(
  profiles: readonly ProfileSummary[],
  groupId: ProfileGroupFilter
): readonly ProfileSummary[] {
  if (groupId === 'all') {
    return profiles;
  }

  if (groupId === 'ungrouped') {
    return profiles.filter((profile) => !profile.groupId);
  }

  return profiles.filter((profile) => profile.groupId === groupId);
}

/** 只有空分组允许删除，避免把 profile 隐式迁移到未分组。 */
export function canDeleteGroup(groupId: string, profiles: readonly ProfileSummary[]): boolean {
  return profiles.every((profile) => profile.groupId !== groupId);
}
