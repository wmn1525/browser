import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  BrowserKernelDownloadProgress,
  BrowserKernelDownloadResult,
  BrowserKernelInfo
} from '../shared/types';

interface FirefoxVersionsResponse {
  readonly LATEST_FIREFOX_VERSION?: string;
}

interface FirefoxRelease {
  readonly id: string;
  readonly label: string;
  readonly version: string;
  readonly description: string;
}

export const firefoxSystemKernelId = 'system-firefox';
export const firefoxLatestKernelId = 'firefox-latest';

const firefoxLatestVersionUrl = 'https://product-details.mozilla.org/1.0/firefox_versions.json';
const firefoxLatestDownloadUrl = 'https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=en-US';
const firefoxStableReleases: readonly FirefoxRelease[] = [
  { id: 'firefox-152', label: 'Firefox 152.0.4', version: '152.0.4', description: 'Mozilla 官方稳定版' },
  { id: 'firefox-140-esr', label: 'Firefox 140.6.0 ESR', version: '140.6.0esr', description: 'Mozilla 官方 ESR 稳定版' },
  { id: 'firefox-128-esr', label: 'Firefox 128.14.0 ESR', version: '128.14.0esr', description: 'Mozilla 官方 ESR 稳定版' },
  { id: 'firefox-120', label: 'Firefox 120.0', version: '120.0', description: 'Mozilla 官方历史稳定版' }
];

/** 管理 Mozilla 官方 Firefox 稳定版下载、本机检测和本地安装状态。 */
export class FirefoxKernelManager {
  public constructor(private readonly root: string) {}

  public async list(): Promise<readonly BrowserKernelInfo[]> {
    return [
      this.detectSystemFirefox(),
      await this.getLatestKernel(),
      ...firefoxStableReleases.map((release) => this.toReleaseKernel(release))
    ];
  }

  public async resolve(kernelId: string): Promise<BrowserKernelInfo | undefined> {
    if (kernelId === firefoxSystemKernelId) {
      return this.detectSystemFirefox();
    }
    if (kernelId === firefoxLatestKernelId) {
      return this.getLatestKernel();
    }

    const release = firefoxStableReleases.find((item) => item.id === kernelId);
    return release ? this.toReleaseKernel(release) : undefined;
  }

  /** 返回 Firefox 最新稳定版选项，并附带本地解包状态。 */
  public async getLatestKernel(): Promise<BrowserKernelInfo> {
    const version = await this.fetchLatestVersion().catch(() => 'latest');
    const executablePath = this.resolveExecutablePath(firefoxLatestKernelId);
    const isInstalled = Boolean(executablePath);
    return {
      id: firefoxLatestKernelId,
      label: version === 'latest' ? 'Firefox 最新稳定版' : `Firefox ${version}`,
      engine: 'firefox',
      version,
      source: isInstalled ? 'downloaded' : 'remote',
      isInstalled,
      executablePath: isInstalled ? executablePath : undefined
    };
  }

  /** 下载 Windows 版 Firefox 安装包，并解包到应用内核目录。 */
  public async download(
    kernelId: string,
    onProgress?: (progress: BrowserKernelDownloadProgress) => void
  ): Promise<BrowserKernelDownloadResult> {
    if (process.platform !== 'win32') {
      throw new Error('Firefox 内核下载当前仅支持 Windows。');
    }

    const remoteKernel = await this.getDownloadKernel(kernelId);
    const targetDir = this.getKernelDir(kernelId);
    const installerPath = join(this.root, 'downloads', `${kernelId}-${remoteKernel.version}.exe`);
    await mkdir(join(this.root, 'downloads'), { recursive: true });
    await rm(targetDir, { force: true, recursive: true });

    const response = await fetch(this.getDownloadUrl(remoteKernel.version));
    if (!response.ok) {
      throw new Error(`Firefox 下载失败: ${response.status} ${response.statusText}`);
    }

    await this.downloadFile(response, kernelId, installerPath, onProgress);
    await mkdir(targetDir, { recursive: true });
    onProgress?.({ kernelId, phase: 'extracting', percent: 100, receivedBytes: 0 });
    await this.extractFirefox(installerPath, targetDir);

    const executablePath = this.resolveExecutablePath(kernelId);
    if (!executablePath) {
      throw new Error('Firefox 解包完成，但未找到 firefox.exe');
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

  public isFirefoxKernel(kernelId: string): boolean {
    return kernelId === firefoxSystemKernelId
      || kernelId === firefoxLatestKernelId
      || firefoxStableReleases.some((release) => release.id === kernelId);
  }

  private detectSystemFirefox(): BrowserKernelInfo {
    const executablePath = this.findFirstExistingPath(this.getFirefoxCandidates());
    return {
      id: firefoxSystemKernelId,
      label: '本机 Firefox',
      engine: 'firefox',
      version: executablePath ? '本机已安装' : '未检测到',
      source: 'system',
      isInstalled: Boolean(executablePath),
      executablePath
    };
  }

  private toReleaseKernel(release: FirefoxRelease): BrowserKernelInfo {
    const executablePath = this.resolveExecutablePath(release.id);
    const isInstalled = Boolean(executablePath);
    return {
      id: release.id,
      label: release.label,
      engine: 'firefox',
      version: release.version,
      source: isInstalled ? 'downloaded' : 'remote',
      isInstalled,
      executablePath: isInstalled ? executablePath : undefined
    };
  }

  private async getDownloadKernel(kernelId: string): Promise<BrowserKernelInfo> {
    const kernel = await this.resolve(kernelId);
    if (!kernel || kernel.source === 'system') {
      throw new Error(`不支持下载的 Firefox 内核: ${kernelId}`);
    }
    return kernel;
  }

  private getDownloadUrl(version: string): string {
    if (version === 'latest') {
      return firefoxLatestDownloadUrl;
    }

    const fileName = encodeURIComponent(`Firefox Setup ${version}.exe`);
    return `https://archive.mozilla.org/pub/firefox/releases/${version}/win64/en-US/${fileName}`;
  }

  private async fetchLatestVersion(): Promise<string> {
    const response = await fetch(firefoxLatestVersionUrl);
    if (!response.ok) {
      throw new Error(`Firefox 版本清单获取失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as FirefoxVersionsResponse;
    if (!data.LATEST_FIREFOX_VERSION) {
      throw new Error('Firefox 版本清单缺少 LATEST_FIREFOX_VERSION');
    }
    return data.LATEST_FIREFOX_VERSION;
  }

  private async downloadFile(
    response: Response,
    kernelId: string,
    installerPath: string,
    onProgress: ((progress: BrowserKernelDownloadProgress) => void) | undefined
  ): Promise<void> {
    const totalBytes = Number.parseInt(response.headers.get('content-length') ?? '', 10);
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    if (!response.body) {
      await writeFile(installerPath, Buffer.from(await response.arrayBuffer()));
      onProgress?.({ kernelId, phase: 'downloaded', percent: 100, receivedBytes });
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

    await writeFile(installerPath, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
    onProgress?.({ kernelId, phase: 'downloaded', percent: 100, receivedBytes });
  }

  private async extractFirefox(installerPath: string, targetDir: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(installerPath, [`/ExtractDir=${targetDir}`], { windowsHide: true });
      child.once('error', reject);
      child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Firefox installer exited with code ${code ?? 'unknown'}`)));
    });
  }

  private getKernelDir(kernelId: string): string {
    return join(this.root, kernelId);
  }

  private resolveExecutablePath(kernelId: string): string | undefined {
    const kernelDir = this.getKernelDir(kernelId);
    const candidates = [
      join(kernelDir, 'firefox.exe'),
      join(kernelDir, 'core', 'firefox.exe')
    ];
    return candidates.find((candidate) => existsSync(candidate));
  }

  private getFirefoxCandidates(): readonly string[] {
    if (process.platform === 'win32') {
      return this.getWindowsFirefoxCandidates();
    }
    if (process.platform === 'darwin') {
      return ['/Applications/Firefox.app/Contents/MacOS/firefox'];
    }
    return [
      '/usr/bin/firefox',
      '/usr/local/bin/firefox',
      '/snap/bin/firefox',
      '/var/lib/flatpak/exports/bin/org.mozilla.firefox'
    ];
  }

  private getWindowsFirefoxCandidates(): readonly string[] {
    const programFiles = process.env.ProgramFiles;
    const programFilesX86 = process.env['ProgramFiles(x86)'];
    return [
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      ...(programFiles ? [join(programFiles, 'Mozilla Firefox', 'firefox.exe')] : []),
      ...(programFilesX86 ? [join(programFilesX86, 'Mozilla Firefox', 'firefox.exe')] : [])
    ];
  }

  private findFirstExistingPath(candidates: readonly string[]): string | undefined {
    return candidates.find((candidate) => existsSync(candidate));
  }
}
