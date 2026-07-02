import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { getChromePath } from '@aitofy/browser-profiles';

import type {
  BrowserKernelDownloadResult,
  BrowserKernelDownloadProgress,
  BrowserKernelInfo
} from '../shared/types';
import { FirefoxKernelManager } from './firefox-kernel-manager';

interface ChromeForTestingMilestone {
  readonly milestone: string;
  readonly version: string;
  readonly downloads: {
    readonly chrome: readonly ChromeForTestingDownload[];
  };
}

interface ChromeForTestingDownload {
  readonly platform: string;
  readonly url: string;
}

interface ChromeForTestingResponse {
  readonly milestones: {
    readonly [milestone: string]: ChromeForTestingMilestone;
  };
}

const kernelMajorVersions = [120, 124, 128, 132, 136, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151] as const;

/** 管理本机 Chrome 与指定版本 Chrome for Testing 内核下载。 */
export class BrowserKernelManager {
  private readonly root = join(homedir(), '.imrun-browser', 'kernels');
  private readonly firefox = new FirefoxKernelManager(this.root);

  public async list(): Promise<readonly BrowserKernelInfo[]> {
    const remote = await this.fetchRemoteKernels().catch(() => this.fallbackRemoteKernels());
    return [
      this.detectSystemChrome(),
      ...await this.firefox.list(),
      ...remote.map((kernel) => this.withInstallState(kernel))
    ];
  }

  public async download(kernelId: string, onProgress?: (progress: BrowserKernelDownloadProgress) => void): Promise<BrowserKernelDownloadResult> {
    if (this.firefox.isFirefoxKernel(kernelId)) {
      return this.firefox.download(kernelId, onProgress);
    }

    const majorVersion = this.parseKernelId(kernelId);
    const remoteKernel = await this.getRemoteKernel(majorVersion);
    const download = await this.getDownload(majorVersion);
    const targetDir = this.getKernelDir(kernelId);
    const zipPath = join(this.root, 'downloads', `${kernelId}-${remoteKernel.version}.zip`);
    await mkdir(join(this.root, 'downloads'), { recursive: true });
    await rm(targetDir, { force: true, recursive: true });

    const response = await fetch(download.url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    await this.downloadZip(response, zipPath, kernelId, onProgress);
    await mkdir(targetDir, { recursive: true });
    onProgress?.({ kernelId, phase: 'extracting', percent: 100, receivedBytes: 0 });
    await this.extractZip(zipPath, targetDir);

    const executablePath = this.getExecutablePath(kernelId);
    if (!existsSync(executablePath)) {
      throw new Error('内核解压完成，但未找到 chrome 可执行文件');
    }
    onProgress?.({ kernelId, phase: 'completed', percent: 100, receivedBytes: 0 });

    return {
      kernel: {
        ...remoteKernel,
        executablePath,
        isInstalled: true,
        source: 'downloaded'
      },
      message: `${remoteKernel.label} 下载完成`
    };
  }

  private async downloadZip(
    response: Response,
    zipPath: string,
    kernelId: string,
    onProgress: ((progress: BrowserKernelDownloadProgress) => void) | undefined
  ): Promise<void> {
    const totalBytes = Number.parseInt(response.headers.get('content-length') ?? '', 10);
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    if (!response.body) {
      await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
      onProgress?.({
        kernelId,
        phase: 'downloaded',
        percent: 100,
        receivedBytes,
        totalBytes: Number.isFinite(totalBytes) ? totalBytes : undefined
      });
      return;
    }

    const reader = response.body.getReader();
    for (;;) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      chunks.push(result.value);
      receivedBytes += result.value.length;
      const percent = Number.isFinite(totalBytes) && totalBytes > 0
        ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100))
        : 0;
      onProgress?.({
        kernelId,
        phase: 'downloading',
        percent,
        receivedBytes,
        totalBytes: Number.isFinite(totalBytes) ? totalBytes : undefined
      });
    }

    await writeFile(zipPath, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
    onProgress?.({
      kernelId,
      phase: 'downloaded',
      percent: 100,
      receivedBytes,
      totalBytes: Number.isFinite(totalBytes) ? totalBytes : undefined
    });
  }

  public async resolveExecutablePath(kernelId: string | undefined): Promise<string | undefined> {
    if (!kernelId || kernelId === 'system-chrome') {
      return undefined;
    }

    const executablePath = this.getExecutablePath(kernelId);
    return existsSync(executablePath) ? executablePath : undefined;
  }

  /** 按内核 ID 返回启动所需信息，未知 ID 保持原有本机 Chrome 行为。 */
  public async resolveKernel(kernelId: string | undefined): Promise<BrowserKernelInfo> {
    if (!kernelId || kernelId === 'system-chrome') {
      return this.detectSystemChrome();
    }

    const firefoxKernel = await this.firefox.resolve(kernelId);
    if (firefoxKernel) {
      return firefoxKernel;
    }

    this.parseKernelId(kernelId);
    const knownKernel = this.fallbackRemoteKernels().find((kernel) => kernel.id === kernelId);
    if (!knownKernel) {
      throw new Error(`不支持的内核版本: ${kernelId}`);
    }

    return this.withInstallState(knownKernel);
  }

  private detectSystemChrome(): BrowserKernelInfo {
    try {
      const executablePath = getChromePath();
      return {
        id: 'system-chrome',
        label: '本机 Chrome',
        engine: 'chromium',
        version: '本机已安装',
        source: 'system',
        isInstalled: true,
        executablePath
      };
    } catch {
      return {
        id: 'system-chrome',
        label: '本机 Chrome',
        engine: 'chromium',
        version: '未检测到',
        source: 'system',
        isInstalled: false
      };
    }
  }

  private async fetchRemoteKernels(): Promise<readonly BrowserKernelInfo[]> {
    const response = await fetch('https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json');
    const data: ChromeForTestingResponse = await response.json();
    return kernelMajorVersions.map((majorVersion) => this.toKernelInfo(data.milestones[String(majorVersion)]));
  }

  private fallbackRemoteKernels(): readonly BrowserKernelInfo[] {
    return [
      fallback(120, '120.0.6099.109'),
      fallback(124, '124.0.6367.207'),
      fallback(128, '128.0.6613.137'),
      fallback(132, '132.0.6834.159'),
      fallback(136, '136.0.7103.113'),
      fallback(140, '140.0.7339.207'),
      fallback(141, '141.0.7390.122'),
      fallback(142, '142.0.7444.175'),
      fallback(143, '143.0.7499.192'),
      fallback(144, '144.0.7559.133'),
      fallback(145, '145.0.7632.117'),
      fallback(146, '146.0.7680.165'),
      fallback(147, '147.0.7727.117'),
      fallback(148, '148.0.7778.178'),
      fallback(149, '149.0.7827.155'),
      fallback(150, '150.0.7871.46'),
      fallback(151, '151.0.7921.0')
    ];
  }

  private async getRemoteKernel(majorVersion: number): Promise<BrowserKernelInfo> {
    const response = await fetch('https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json');
    const data: ChromeForTestingResponse = await response.json();
    return this.toKernelInfo(data.milestones[String(majorVersion)]);
  }

  private async getDownload(majorVersion: number): Promise<ChromeForTestingDownload> {
    const response = await fetch('https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json');
    const data: ChromeForTestingResponse = await response.json();
    const milestone = data.milestones[String(majorVersion)];
    const platform = this.getDownloadPlatform();
    const download = milestone.downloads.chrome.find((item) => item.platform === platform);
    if (!download) {
      throw new Error(`当前平台暂不支持下载: ${platform}`);
    }
    return download;
  }

  private toKernelInfo(milestone: ChromeForTestingMilestone | undefined): BrowserKernelInfo {
    if (!milestone) {
      throw new Error('Chrome for Testing 版本清单缺少目标里程碑');
    }

    const majorVersion = Number.parseInt(milestone.milestone, 10);
    return {
      id: `chrome-${majorVersion}`,
      label: `Chrome ${milestone.version}`,
      engine: 'chromium',
      majorVersion,
      version: milestone.version,
      source: 'remote',
      isInstalled: false
    };
  }

  private withInstallState(kernel: BrowserKernelInfo): BrowserKernelInfo {
    const executablePath = this.getExecutablePath(kernel.id);
    return {
      ...kernel,
      executablePath: existsSync(executablePath) ? executablePath : undefined,
      isInstalled: existsSync(executablePath),
      source: existsSync(executablePath) ? 'downloaded' : kernel.source
    };
  }

  private parseKernelId(kernelId: string): number {
    const match = /^chrome-(\d+)$/.exec(kernelId);
    const majorVersion = match ? Number.parseInt(match[1], 10) : Number.NaN;
    if (!Number.isFinite(majorVersion) || !kernelMajorVersions.some((version) => version === majorVersion)) {
      throw new Error(`不支持的内核版本: ${kernelId}`);
    }
    return majorVersion;
  }

  private getDownloadPlatform(): string {
    if (process.platform === 'win32') {
      return 'win64';
    }
    if (process.platform === 'darwin') {
      return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    }
    return 'linux64';
  }

  private getKernelDir(kernelId: string): string {
    return join(this.root, kernelId);
  }

  private getExecutablePath(kernelId: string): string {
    const dir = this.getKernelDir(kernelId);
    if (process.platform === 'win32') {
      return join(dir, 'chrome-win64', 'chrome.exe');
    }
    if (process.platform === 'darwin') {
      const folder = process.arch === 'arm64' ? 'chrome-mac-arm64' : 'chrome-mac-x64';
      return join(dir, folder, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
    }
    return join(dir, 'chrome-linux64', 'chrome');
  }

  private async extractZip(zipPath: string, targetDir: string): Promise<void> {
    if (process.platform === 'win32') {
      await this.runCommand('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${targetDir}' -Force`]);
      return;
    }

    await this.runCommand('unzip', ['-q', zipPath, '-d', targetDir]);
  }

  private async runCommand(command: string, args: readonly string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { windowsHide: true });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
      });
    });
  }
}

function fallback(majorVersion: number, version: string): BrowserKernelInfo {
  return {
    id: `chrome-${majorVersion}`,
    label: `Chrome ${version}`,
    engine: 'chromium',
    majorVersion,
    version,
    source: 'remote',
    isInstalled: false
  };
}
