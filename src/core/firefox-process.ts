import findProcessModule = require('find-process');
import type { ProcessInfo } from 'find-process';
import treeKill from 'tree-kill';

/** Firefox 进程匹配只需要稳定字段，避免把第三方类型泄露到启动器。 */
export interface FirefoxProcessInfo {
  /** 系统进程 PID，用于后续关闭进程树。 */
  readonly pid: number;
  /** 进程名用于先过滤非 Firefox 进程，减少命令行误匹配。 */
  readonly name: string;
  /** 完整命令行包含 profile 目录，是识别独立实例的关键依据。 */
  readonly cmd: string;
}

/** 归一化命令行路径，用于跨 Windows/macOS/Linux 做 profile 目录匹配。 */
export function normalizeProcessPath(value: string): string {
  return value.trim().replaceAll('\\', '/').replaceAll('"', '').toLowerCase();
}

/** 判断系统进程是否属于指定 Firefox profile 目录。 */
export function isFirefoxProfileProcess(process: FirefoxProcessInfo, profileDir: string): boolean {
  if (!isFirefoxProcessName(process.name)) {
    return false;
  }

  return normalizeProcessPath(process.cmd).includes(normalizeProcessPath(profileDir));
}

/** 查找命令行里带有目标 profile 目录的真实 Firefox 进程。 */
export async function findFirefoxProfileProcesses(profileDir: string): Promise<readonly FirefoxProcessInfo[]> {
  const processes = await findProcessModule.default('name', 'firefox', { logLevel: 'error' });
  return processes.filter((process) => isFirefoxProfileProcess(toFirefoxProcessInfo(process), profileDir));
}

/** 关闭指定 PID 的进程树；Windows 下由 tree-kill 映射到 taskkill /T /F。 */
export async function killProcessTree(pid: number): Promise<void> {
  if (!isProcessRunning(pid)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    treeKill(pid, (error) => {
      if (!error || isProcessAlreadyGone(error) || !isProcessRunning(pid)) {
        resolve();
        return;
      }

      reject(error);
    });
  });
}

/** taskkill 前后都确认一次 PID，避免 stale lock 里的旧 PID 让清理失败。 */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function toFirefoxProcessInfo(process: ProcessInfo): FirefoxProcessInfo {
  return {
    pid: process.pid,
    name: process.name,
    cmd: process.cmd
  };
}

/** Firefox 进程名在不同系统上可能是 firefox 或 firefox.exe。 */
function isFirefoxProcessName(name: string): boolean {
  const normalized = normalizeProcessPath(name);
  return (
    normalized === 'firefox' ||
    normalized === 'firefox.exe' ||
    normalized.endsWith('/firefox') ||
    normalized.endsWith('/firefox.exe')
  );
}

/** 关闭时进程可能已被用户手动退出，这类错误不应阻断状态清理。 */
function isProcessAlreadyGone(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('not found') || message.includes('no such process') || message.includes('no running instance');
}
