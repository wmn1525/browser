import type { BrowserProfiles, StoredProfile } from '@aitofy/browser-profiles';

import type { ExtendedProfileConfig, ExtendedStoredProfile } from './profile-dto-mapper';

/** 是否已被移入回收站。 */
export function isProfileDeleted(profile: StoredProfile): boolean {
  const extendedProfile: ExtendedStoredProfile = profile;
  return extendedProfile.deletedAt !== undefined;
}

/**
 * 写入或清除回收站标记。
 * deletedAt 不在 normalizeProfileDraft 的返回体里，核心库 update 又是浅合并，
 * 因此这里只动这一个字段，其余配置原样保留；恢复时数据从头到尾没被碰过。
 */
export async function markProfileDeleted(
  profiles: BrowserProfiles,
  profileId: string,
  deletedAt: number | undefined
): Promise<void> {
  const updates: Partial<ExtendedProfileConfig> = { deletedAt, id: undefined };
  const profile = await profiles.update(profileId, updates);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }
}

/** 含回收站在内的全部 profile id：孤儿判定要用它，否则会把还能恢复的数据当垃圾清掉。 */
export async function listAllProfileIds(profiles: BrowserProfiles): Promise<readonly string[]> {
  const all = await profiles.list();
  return all.map((profile) => profile.id);
}
