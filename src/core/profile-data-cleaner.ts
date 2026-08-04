import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, sep } from 'node:path';

import { findChromiumProfileProcesses } from './chromium-profile-processes';
import { killProcessTree } from './firefox-process';

interface BrowserLockInfo {
  /** 核心库写入的浏览器 PID，用于运行态丢失时补充关闭。 */
  readonly pid?: number;
  /** 核心库写入的调试端口，仅用于判断 lock 文件结构。 */
  readonly port?: number;
}

/** Chromium profile 数据目录跟随核心库默认存储位置，换新时只清理浏览器用户数据。 */
const chromiumProfilesRoot = resolve(homedir(), '.aitofy', 'browser-profiles', 'profiles');
const defaultChromiumDataDir = 'data';
const removeRetryDelays = [200, 500, 1000, 1500, 2500];

/** 返回 Chromium user-data-dir，换新后的目录名会保存在 profile 元数据里。 */
export function getChromiumProfileDataPath(profileId: string, dataDirName: string | undefined): string {
  return getSafeChildPath(chromiumProfilesRoot, profileId, dataDirName ?? defaultChromiumDataDir);
}

/** 生成新的 Chromium user data 目录，旧目录后台清理，避免旧日志锁阻塞下次启动。 */
export async function renewChromiumProfileData(profileId: string, oldDataDirName: string | undefined): Promise<string> {
  const profileRoot = getSafeChildPath(chromiumProfilesRoot, profileId);
  const oldDataPath = getChromiumProfileDataPath(profileId, oldDataDirName);
  const nextDataDirName = `data-renew-${Date.now()}`;
  const nextDataPath = getChromiumProfileDataPath(profileId, nextDataDirName);
  console.log(`[profiles:renew] 清理开始: ${profileId}`);
  await runStep(profileId, '关闭占用进程', () => killChromiumProfileProcesses(oldDataPath));
  await runStep(profileId, '创建新 data 目录', () => mkdir(nextDataPath, { recursive: true }));
  void cleanupOldProfileData(profileRoot, nextDataDirName).catch(() => undefined);
  console.log(`[profiles:renew] 清理完成: ${profileId}`);
  return nextDataDirName;
}

/** 删除 profile 前释放 user data 目录占用：Windows 上句柄未释放会让核心库的 rmSync 抛 EBUSY/EPERM。 */
export async function releaseChromiumProfileData(profileId: string, dataDirName: string | undefined): Promise<void> {
  await killChromiumProfileProcesses(getChromiumProfileDataPath(profileId, dataDirName));
}

/** 删除历史数据目录只是后台卫生任务，失败不能影响新目录启动。 */
async function cleanupOldProfileData(profileRoot: string, activeDataDirName: string): Promise<void> {
  const entries = await readdir(profileRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('data') || entry.name === activeDataDirName) {
      continue;
    }

    await removeProfileDataWithRetry(getSafeChildPath(profileRoot, entry.name)).catch(() => undefined);
  }
}

/** 关闭仍携带目标 user-data-dir 的 Chromium 进程，处理应用运行态丢失后的目录占用。 */
async function killChromiumProfileProcesses(dataPath: string): Promise<void> {
  const lockInfo = await readBrowserLock(dataPath);
  const processes = await findChromiumProfileProcesses(dataPath);
  const pids = new Set([
    ...processes.map((process) => process.pid),
    ...(await readChromePid(dataPath)),
    ...(lockInfo?.pid ? [lockInfo.pid] : [])
  ]);
  for (const pid of pids) {
    await withTimeout(killProcessTree(pid), 3000);
  }
  await waitForProfileProcessesExit(dataPath);
}

/** Windows 文件句柄释放有延迟，删除失败时短暂等待后重试。 */
async function removeProfileDataWithRetry(dataPath: string): Promise<void> {
  for (const delayMs of [0, ...removeRetryDelays]) {
    if (delayMs > 0) {
      await delay(delayMs);
    }
    try {
      await rm(dataPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return;
    } catch (error) {
      if (delayMs === removeRetryDelays[removeRetryDelays.length - 1]) {
        throw error;
      }
    }
  }
}

/** 等待系统真正释放 profile 目录，避免刚杀进程就删除导致 ENOTEMPTY/EPERM。 */
async function waitForProfileProcessesExit(dataPath: string): Promise<void> {
  for (const delayMs of [100, 200, 400, 800, 1200]) {
    if ((await findChromiumProfileProcesses(dataPath)).length === 0) {
      return;
    }
    await delay(delayMs);
  }
}

async function readBrowserLock(dataPath: string): Promise<BrowserLockInfo | undefined> {
  try {
    const parsed = JSON.parse(await readFile(resolve(dataPath, '.browser-lock.json'), 'utf8')) as Partial<BrowserLockInfo>;
    return {
      pid: typeof parsed.pid === 'number' ? parsed.pid : undefined,
      port: typeof parsed.port === 'number' ? parsed.port : undefined
    };
  } catch {
    return undefined;
  }
}

async function readChromePid(dataPath: string): Promise<readonly number[]> {
  try {
    const pid = Number.parseInt(await readFile(resolve(dataPath, 'chrome.pid'), 'utf8'), 10);
    return Number.isInteger(pid) && pid > 0 ? [pid] : [];
  } catch {
    return [];
  }
}

/** 递归删除前校验路径仍位于预期根目录，避免异常 id 影响其他目录。 */
function getSafeChildPath(root: string, ...parts: readonly string[]): string {
  const target = resolve(root, ...parts);
  const normalizedRoot = root.endsWith(sep) ? root : `${root}${sep}`;
  if (!target.startsWith(normalizedRoot)) {
    throw new Error(`Profile data path is outside storage root: ${target}`);
  }
  return target;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

async function runStep<T>(profileId: string, label: string, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  console.log(`[profiles:renew] ${label} 开始: ${profileId}`);
  try {
    const result = await task();
    console.log(`[profiles:renew] ${label} 完成: ${profileId}, ${Date.now() - startedAt}ms`);
    return result;
  } catch (error) {
    console.error(`[profiles:renew] ${label} 失败: ${profileId}, ${Date.now() - startedAt}ms`, error);
    throw error;
  }
}

/** 关闭进程不能无限等待，超时后继续走目录轮换，让后续步骤给出明确结果。 */
async function withTimeout(task: Promise<void>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      task,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
