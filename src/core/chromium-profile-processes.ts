import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import findProcessModule = require('find-process');
import type { ProcessInfo } from 'find-process';

import { normalizeProcessPath } from './firefox-process';

/** Chromium profile 进程的最小信息，用于关闭仍占用 user-data-dir 的浏览器。 */
export interface ChromiumProfileProcessInfo {
  /** 系统进程 PID，用于关闭进程树。 */
  readonly pid: number;
  /** 进程名只用于诊断和去重。 */
  readonly name: string;
  /** 完整命令行包含 user-data-dir，是识别当前环境的关键依据。 */
  readonly cmd: string;
}

type WindowsProcessJson = ChromiumProfileProcessInfo | readonly ChromiumProfileProcessInfo[];

const chromiumProcessNames = ['chrome', 'chromium', 'msedge'];
const execFileAsync = promisify(execFile);
/**
 * 待匹配路径通过环境变量传给 PowerShell。
 * `powershell.exe -Command` 不会把尾随参数放进 `$args`（那是 `-File` 的行为），
 * 早前用 `$args[0]` 会让脚本抛 "不能对 Null 值表达式调用方法" 而整个分支静默失效；
 * 走环境变量同时避免了路径里的引号被当成脚本语法。
 */
const needleEnvName = 'IMRUN_PROFILE_DATA_PATH';

/** 汇总通用进程查询和 Windows 命令行查询，尽量找全占用 profile 的 Chromium 进程。 */
export async function findChromiumProfileProcesses(dataPath: string): Promise<readonly ChromiumProfileProcessInfo[]> {
  const [standardProcesses, windowsProcesses] = await Promise.all([
    withTimeout(findStandardChromiumProfileProcesses(dataPath), 2500, []),
    withTimeout(findWindowsChromiumProfileProcesses(dataPath), 3000, [])
  ]);
  return Array.from(new Map([...standardProcesses, ...windowsProcesses].map((process) => [process.pid, process])).values());
}

async function findStandardChromiumProfileProcesses(dataPath: string): Promise<readonly ChromiumProfileProcessInfo[]> {
  const results = await Promise.all(
    chromiumProcessNames.map((name) => findProcessModule.default('name', name, { logLevel: 'error' }))
  );
  const profilePath = normalizeProcessPath(dataPath);
  return results
    .flat()
    .map(toProfileProcessInfo)
    .filter((process) => normalizeProcessPath(process.cmd).includes(profilePath));
}

/** Windows 下直接查询 Win32_Process.CommandLine，弥补按进程名查询命令行不完整的问题。 */
async function findWindowsChromiumProfileProcesses(dataPath: string): Promise<readonly ChromiumProfileProcessInfo[]> {
  if (process.platform !== 'win32') {
    return [];
  }

  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      [
        `$needle=$env:${needleEnvName}.ToLower().Replace("\\","/");`,
        'Get-CimInstance Win32_Process |',
        'Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Replace("\\","/").Contains($needle) } |',
        'Select-Object @{Name="pid";Expression={$_.ProcessId}},@{Name="name";Expression={$_.Name}},@{Name="cmd";Expression={$_.CommandLine}} |',
        'ConvertTo-Json -Compress'
      ].join(' ')
    ], { timeout: 2500, windowsHide: true, env: { ...process.env, [needleEnvName]: dataPath } });
    return parseWindowsProcesses(stdout);
  } catch {
    return [];
  }
}

function parseWindowsProcesses(stdout: string): readonly ChromiumProfileProcessInfo[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }

  const parsed = JSON.parse(trimmed) as WindowsProcessJson;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.filter(isProfileProcessInfo);
}

function toProfileProcessInfo(process: ProcessInfo): ChromiumProfileProcessInfo {
  return {
    pid: process.pid,
    name: process.name,
    cmd: process.cmd
  };
}

function isProfileProcessInfo(value: ChromiumProfileProcessInfo): boolean {
  return (
    Number.isInteger(value.pid) &&
    value.pid > 0 &&
    typeof value.name === 'string' &&
    typeof value.cmd === 'string'
  );
}

/** 进程查询只是清理前兜底，超时后返回默认值，不能拖住换新主流程。 */
async function withTimeout<T>(task: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
