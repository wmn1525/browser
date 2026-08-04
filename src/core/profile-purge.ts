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

    await removeDataDir(profileId, entry.name);
  }
}

/**
 * 先直接删，失败才结束占用进程后重试。
 * 进程扫描要走 PowerShell 查询、单次 2-3 秒，无条件执行会让每次彻底删除都明显卡顿；
 * 而绝大多数情况下环境早已关闭，目录根本没被占用。
 */
async function removeDataDir(profileId: string, dataDirName: string): Promise<void> {
  const dataPath = getChromiumProfileDataPath(profileId, dataDirName);
  try {
    await rm(dataPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[profiles:purge] 数据目录被占用，结束残留进程后重试: ${profileId}/${dataDirName}`, error);
    await releaseChromiumProfileData(profileId, dataDirName);
    await rm(dataPath, { recursive: true, force: true });
  }
}
