import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { getFirefoxProfilesRoot } from './firefox-profile-launcher';
import { getChromiumProfileDataPath, getChromiumProfileRoot, releaseChromiumProfileData } from './profile-data-cleaner';

/**
 * 彻底删除单个 profile 的全部浏览器数据。
 *
 * 顺序是刻意的：先清空数据目录，最后才让核心库删掉 config.json。
 * 核心库的 rmSync 是深度优先，config.json 会先于 data/ 被删；一旦 data/ 被残留进程占用而失败，
 * 结果是环境从列表里消失、几百 MB 数据却永久留在磁盘上，用户既看不到也无法重试。
 * 反过来先删数据，失败时 config.json 还在，环境仍留在回收站里可以再删一次。
 */
export async function purgeProfileBrowserData(profileId: string): Promise<void> {
  await purgeChromiumDataDirs(profileId);
  // Firefox profile 在另一个根目录下，核心库的删除够不到，必须单独清
  await rm(join(getFirefoxProfilesRoot(), profileId), { recursive: true, force: true });
}

/**
 * 清空该 profile 下所有 Chromium 数据目录。
 * 换新会生成 data-renew-<时间戳> 并在后台尽力清理旧目录，失败即残留，
 * 所以这里遍历所有 data 开头的目录，而不是只删 chromiumDataDir 指向的那一个。
 */
async function purgeChromiumDataDirs(profileId: string): Promise<void> {
  const entries = await readdir(getChromiumProfileRoot(profileId), { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('data')) {
      continue;
    }

    // 结束仍占用该目录的浏览器进程，否则 Windows 上会抛 EBUSY/EPERM
    await releaseChromiumProfileData(profileId, entry.name);
    await rm(getChromiumProfileDataPath(profileId, entry.name), { recursive: true, force: true });
  }
}
