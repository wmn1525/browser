import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { OrphanDataReport } from '../shared/types';
import { getFirefoxProfilesRoot } from './firefox-profile-launcher';
import { getChromiumProfilesRoot } from './profile-data-cleaner';

/** 一处待回收的孤儿目录。 */
interface OrphanEntry {
  readonly path: string;
  readonly bytes: number;
}

/**
 * 扫描无主的浏览器数据目录。
 *
 * 两类历史遗留：
 * 1. Chromium：删除中途失败留下只有 data/ 没有 config.json 的目录，应用完全看不到；
 * 2. Firefox：删除路径过去从不清理 firefox-profiles，对应环境早已不存在。
 * 两者都无法通过回收站管理，只能靠扫描回收。
 */
export async function scanOrphanProfileData(liveProfileIds: readonly string[]): Promise<OrphanDataReport> {
  const entries = await collectOrphans(liveProfileIds);
  return toReport(entries);
}

/** 删除扫描到的孤儿目录，返回实际回收的量。删不掉的目录跳过，不中断其余清理。 */
export async function purgeOrphanProfileData(liveProfileIds: readonly string[]): Promise<OrphanDataReport> {
  const entries = await collectOrphans(liveProfileIds);
  const removed: OrphanEntry[] = [];
  for (const entry of entries) {
    try {
      await rm(entry.path, { recursive: true, force: true });
      removed.push(entry);
    } catch (error) {
      console.warn(`[profiles:orphan] 清理失败，跳过: ${entry.path}`, error);
    }
  }

  return toReport(removed);
}

async function collectOrphans(liveProfileIds: readonly string[]): Promise<readonly OrphanEntry[]> {
  const live = new Set(liveProfileIds);
  return [...await collectChromiumOrphans(), ...await collectFirefoxOrphans(live)];
}

/** 没有 config.json 的目录即无主：应用只认 config.json，读不到就永远列不出来。 */
async function collectChromiumOrphans(): Promise<readonly OrphanEntry[]> {
  const root = getChromiumProfilesRoot();
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const orphans: OrphanEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const path = join(root, entry.name);
    const hasConfig = await stat(join(path, 'config.json')).then(() => true).catch(() => false);
    if (!hasConfig) {
      orphans.push({ path, bytes: await getDirectorySize(path) });
    }
  }

  return orphans;
}

/** Firefox 目录名就是 profileId，对不上任何现存环境即无主。 */
async function collectFirefoxOrphans(live: ReadonlySet<string>): Promise<readonly OrphanEntry[]> {
  const root = getFirefoxProfilesRoot();
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const orphans: OrphanEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || live.has(entry.name)) {
      continue;
    }

    const path = join(root, entry.name);
    orphans.push({ path, bytes: await getDirectorySize(path) });
  }

  return orphans;
}

async function getDirectorySize(path: string): Promise<number> {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  let total = 0;
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      total += await getDirectorySize(child);
      continue;
    }

    total += await stat(child).then((info) => info.size).catch(() => 0);
  }

  return total;
}

function toReport(entries: readonly OrphanEntry[]): OrphanDataReport {
  return {
    count: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0)
  };
}
