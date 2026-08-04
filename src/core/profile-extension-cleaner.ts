import type { BrowserProfiles } from '@aitofy/browser-profiles';

import type { ExtendedProfileConfig, ExtendedStoredProfile } from './profile-dto-mapper';

/**
 * 删除全局扩展后，清理所有 profile 里残留的禁用记录。
 * 回收站里的环境也一并处理：恢复后不该带着一个已经不存在的扩展 id。
 */
export async function removeDisabledExtensionIdFromProfiles(
  profiles: BrowserProfiles,
  extensionId: string
): Promise<void> {
  const all = await profiles.list();
  for (const profile of all) {
    const extendedProfile: ExtendedStoredProfile = profile;
    const disabledIds = extendedProfile.disabledGlobalExtensionIds ?? [];
    const nextIds = disabledIds.filter((id) => id !== extensionId);
    if (nextIds.length === disabledIds.length) {
      continue;
    }

    const updates: Partial<ExtendedProfileConfig> = { disabledGlobalExtensionIds: nextIds };
    await profiles.update(profile.id, updates);
  }
}
