import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { FingerprintDraft, ProxyDraft } from '../shared/types';
import { getFirefoxExtensionTargetName } from './extension-manager';
import { findFirefoxProfileProcesses, killProcessTree } from './firefox-process';

/** Firefox 启动所需的 profile 快照，避免启动器依赖完整业务 DTO。 */
export interface FirefoxLaunchProfile {
  readonly id: string;
  readonly proxy?: ProxyDraft;
  readonly userAgent?: string;
  readonly timezone?: string;
  readonly fingerprint?: FingerprintDraft;
  readonly loadImages?: boolean;
  readonly loadVideos?: boolean;
  readonly extensionPaths: readonly string[];
  readonly startUrls: readonly string[];
}

/** Firefox 子进程启动结果，当前只暴露运行态需要的字段。 */
export interface FirefoxLaunchResult {
  readonly profileId: string;
  readonly pid?: number;
}

/** Firefox 会派生真实窗口进程，session 记录 profile 目录而不是只记录 spawn 结果。 */
interface FirefoxRunningSession {
  /** 独立 profile 目录是识别真实 Firefox 进程的稳定锚点。 */
  readonly profileDir: string;
  /** 真实进程退出后通知上层清理 UI 运行态。 */
  readonly onExit: (profileId: string) => void;
  /** spawn 返回的启动壳进程，Windows 上不一定是真实窗口进程。 */
  child?: ChildProcess;
  /** 定时扫描器用于发现用户手动关闭 Firefox 的情况。 */
  monitor?: ReturnType<typeof setInterval>;
  /** 最近一次识别到的 Firefox PID，方便后续扩展诊断信息。 */
  pid?: number;
  /** 主动关闭时禁止监控器重复触发退出回调。 */
  closing: boolean;
}

/** 管理真实 Firefox/Gecko 子进程与独立 profile 目录。 */
export class FirefoxProfileLauncher {
  private readonly root = join(homedir(), '.imrun-browser', 'firefox-profiles');
  private readonly sessions = new Map<string, FirefoxRunningSession>();

  /** 启动 Firefox 并在进程退出时通知调用方清理运行态。 */
  public async launch(
    profile: FirefoxLaunchProfile,
    executablePath: string,
    onExit: (profileId: string) => void
  ): Promise<FirefoxLaunchResult> {
    const profileDir = this.getProfileDir(profile.id);
    await mkdir(profileDir, { recursive: true });
    await this.writeUserPrefs(profile, profileDir);
    await this.prepareExtensions(profile.extensionPaths, profileDir);

    const session: FirefoxRunningSession = {
      profileDir,
      onExit,
      closing: false
    };
    this.sessions.set(profile.id, session);

    const child = spawn(executablePath, this.buildArgs(profile, profileDir), {
      detached: false,
      stdio: 'ignore',
      windowsHide: false
    });
    session.child = child;
    session.pid = child.pid;

    child.once('exit', () => {
      session.child = undefined;
    });
    child.unref();

    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', (error) => {
        this.sessions.delete(profile.id);
        reject(error);
      });
    });

    this.startMonitor(profile.id, session);
    void this.refreshRealPid(session);

    return { profileId: profile.id, pid: session.pid };
  }

  /** 关闭目标 profile 的真实 Firefox 进程树，外部已关闭时只清理记录。 */
  public async close(profileId: string): Promise<void> {
    const session = this.sessions.get(profileId);
    if (!session) {
      return;
    }

    session.closing = true;
    this.stopMonitor(session);

    const processes = await findFirefoxProfileProcesses(session.profileDir);
    const pids = new Set(processes.map((process) => process.pid));
    if (session.child?.pid) {
      pids.add(session.child.pid);
    }

    for (const pid of pids) {
      await killProcessTree(pid);
    }

    this.finishClosed(profileId, session);
  }

  /** 只表示本应用仍在追踪该 profile，真实进程由监控器持续校准。 */
  public isRunning(profileId: string): boolean {
    return this.sessions.has(profileId);
  }

  /** 所有 Firefox 独立 profile 固定放在应用私有目录下。 */
  private getProfileDir(profileId: string): string {
    return join(this.root, profileId);
  }

  /** Firefox 通过 user.js 固化本次启动的代理与可稳定生效的指纹偏好。 */
  private async writeUserPrefs(profile: FirefoxLaunchProfile, profileDir: string): Promise<void> {
    const lines = [
      ...(profile.proxy ? this.getProxyPrefs(profile.proxy) : ['user_pref("network.proxy.type", 0);']),
      ...this.getFingerprintPrefs(profile)
    ];
    await writeFile(join(profileDir, 'user.js'), `${lines.join('\n')}\n`, 'utf8');
  }

  /** 将 UI 代理模型转成 Firefox user.js 偏好项。 */
  private getProxyPrefs(proxy: ProxyDraft): readonly string[] {
    if (proxy.username || proxy.password) {
      throw new Error('Firefox 内核暂不支持带账号密码的代理，请使用无认证代理。');
    }

    if (proxy.type === 'socks5') {
      return [
        'user_pref("network.proxy.type", 1);',
        `user_pref("network.proxy.socks", "${escapePref(proxy.host)}");`,
        `user_pref("network.proxy.socks_port", ${proxy.port});`,
        'user_pref("network.proxy.socks_version", 5);',
        'user_pref("network.proxy.no_proxies_on", "");'
      ];
    }

    return [
      'user_pref("network.proxy.type", 1);',
      `user_pref("network.proxy.http", "${escapePref(proxy.host)}");`,
      `user_pref("network.proxy.http_port", ${proxy.port});`,
      `user_pref("network.proxy.ssl", "${escapePref(proxy.host)}");`,
      `user_pref("network.proxy.ssl_port", ${proxy.port});`,
      'user_pref("network.proxy.no_proxies_on", "");'
    ];
  }

  /** 只写 Firefox 原生 prefs 支持的字段，避免承诺 JS 注入级伪装。 */
  private getFingerprintPrefs(profile: FirefoxLaunchProfile): readonly string[] {
    const lines: string[] = [];
    const fingerprint = profile.fingerprint;
    if (profile.userAgent) {
      lines.push(`user_pref("general.useragent.override", "${escapePref(profile.userAgent)}");`);
    }
    if (profile.timezone) {
      lines.push(`user_pref("intl.timezone.override", "${escapePref(profile.timezone)}");`);
    }

    const languages = this.getLanguageList(fingerprint);
    if (languages) {
      lines.push(`user_pref("intl.accept_languages", "${escapePref(languages)}");`);
    }
    if (fingerprint?.webrtcMode === 'disabled') {
      lines.push('user_pref("media.peerconnection.enabled", false);');
    }
    if (fingerprint?.serviceWorkerMode === 'disabled') {
      lines.push('user_pref("dom.serviceWorkers.enabled", false);');
    }
    if (profile.loadImages === false) {
      lines.push('user_pref("permissions.default.image", 2);');
    }
    if (profile.loadVideos === false) {
      lines.push('user_pref("media.autoplay.default", 5);');
      lines.push('user_pref("media.block-autoplay-until-in-foreground", true);');
    }
    if (profile.extensionPaths.length > 0) {
      lines.push('user_pref("extensions.autoDisableScopes", 0);');
      lines.push('user_pref("extensions.enabledScopes", 15);');
      lines.push('user_pref("extensions.startupScanScopes", 15);');
      lines.push('user_pref("extensions.installDistroAddons", false);');
    }

    return lines;
  }

  /** Firefox 通过 profile/extensions 目录安装 XPI，启动前复制本次启用的扩展。 */
  private async prepareExtensions(extensionPaths: readonly string[], profileDir: string): Promise<void> {
    const extensionDir = join(profileDir, 'extensions');
    await rm(extensionDir, { recursive: true, force: true });
    if (extensionPaths.length === 0) {
      return;
    }

    await mkdir(extensionDir, { recursive: true });
    for (const extensionPath of extensionPaths) {
      const targetName = getFirefoxExtensionTargetName(extensionPath);
      await copyFile(extensionPath, join(extensionDir, targetName));
    }
  }

  /** Firefox 接受逗号分隔的语言列表，缺失列表时回退到主语言。 */
  private getLanguageList(fingerprint: FingerprintDraft | undefined): string | undefined {
    const languages = fingerprint?.languages ?? fingerprint?.language;
    return languages?.split(',').map((item) => item.trim()).filter(Boolean).join(', ');
  }

  /** 使用 --no-remote 和独立 profile 强制启动隔离 Firefox 实例。 */
  private buildArgs(profile: FirefoxLaunchProfile, profileDir: string): readonly string[] {
    return [
      '--no-remote',
      '--new-instance',
      '--profile',
      profileDir,
      ...profile.startUrls
    ];
  }

  /** 定期扫描真实 Firefox 进程，避免启动壳进程退出导致运行态提前丢失。 */
  private startMonitor(profileId: string, session: FirefoxRunningSession): void {
    this.stopMonitor(session);
    session.monitor = setInterval(() => {
      void this.refreshRealPid(session).then((running) => {
        if (running || session.child || session.closing) {
          return;
        }

        this.finishClosed(profileId, session);
      });
    }, 2000);
  }

  /** 关闭监控器，避免主动关闭或外部退出后继续轮询系统进程。 */
  private stopMonitor(session: FirefoxRunningSession): void {
    if (!session.monitor) {
      return;
    }

    clearInterval(session.monitor);
    session.monitor = undefined;
  }

  /** 通过 profile 目录定位 Firefox 派生出的真实窗口进程。 */
  private async refreshRealPid(session: FirefoxRunningSession): Promise<boolean> {
    const processes = await findFirefoxProfileProcesses(session.profileDir);
    const process = processes[0];
    session.pid = process?.pid ?? session.child?.pid;
    return processes.length > 0;
  }

  /** 统一收敛关闭路径，保证 session 和上层运行态一起清理。 */
  private finishClosed(profileId: string, session: FirefoxRunningSession): void {
    this.stopMonitor(session);
    this.sessions.delete(profileId);
    session.onExit(profileId);
  }
}

/** 转义 Firefox pref 字符串，避免路径或代理主机中的引号破坏 user.js。 */
function escapePref(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}
