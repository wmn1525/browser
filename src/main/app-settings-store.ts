import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { AppDataDirectoryInfo } from '../shared/types';

interface StoredAppSettings {
  readonly dataDirectory?: string;
}

export interface AppSettingsStoreOptions {
  readonly appDataPath: string;
  readonly appName: string;
  readonly defaultDataPath: string;
  readonly getCurrentDataPath: () => string;
}

export interface AppPathAdapter {
  readonly isPackaged: boolean;
  readonly getName: () => string;
  readonly getPath: (name: 'appData' | 'userData') => string;
  readonly setPath: (name: 'userData' | 'sessionData', path: string) => void;
}

let activeAppSettingsStore: AppSettingsStore | undefined;

/** 应用级设置存储，独立放在 appData，避免跟随 userData 迁移后丢失入口。 */
export class AppSettingsStore {
  public constructor(private readonly options: AppSettingsStoreOptions) {}

  /** 返回当前目录和下次启动目录，用于设置中心展示是否需要重启。 */
  public async getDataDirectoryInfo(): Promise<AppDataDirectoryInfo> {
    const configuredPath = await this.readDataDirectory();
    const currentPath = normalizePath(this.options.getCurrentDataPath());
    const defaultPath = normalizePath(this.options.defaultDataPath);
    const nextStartPath = configuredPath ?? defaultPath;
    return {
      currentPath,
      defaultPath,
      configuredPath,
      nextStartPath,
      restartRequired: currentPath !== nextStartPath
    };
  }

  /** 保存用户手动迁移后的目录；运行中不搬迁文件，只让下次启动使用。 */
  public async setDataDirectory(directoryPath: string): Promise<AppDataDirectoryInfo> {
    const nextPath = normalizePath(directoryPath);
    await mkdir(nextPath, { recursive: true });
    await this.save({ dataDirectory: nextPath });
    return this.getDataDirectoryInfo();
  }

  /** 恢复默认数据目录，同样需要下次启动后才会切换。 */
  public async resetDataDirectory(): Promise<AppDataDirectoryInfo> {
    await rm(this.getFilePath(), { force: true });
    return this.getDataDirectoryInfo();
  }

  /** 主进程启动早期读取应该应用到 Electron 的数据目录。 */
  public async resolveStartupDataDirectory(): Promise<string> {
    return (await this.readDataDirectory()) ?? normalizePath(this.options.defaultDataPath);
  }

  private async readDataDirectory(): Promise<string | undefined> {
    const settings = await this.read();
    return settings?.dataDirectory ? normalizePath(settings.dataDirectory) : undefined;
  }

  private async read(): Promise<StoredAppSettings | undefined> {
    try {
      const parsed = JSON.parse(await readFile(this.getFilePath(), 'utf8')) as Partial<StoredAppSettings>;
      return {
        dataDirectory: typeof parsed.dataDirectory === 'string' ? parsed.dataDirectory : undefined
      };
    } catch {
      return undefined;
    }
  }

  private async save(settings: StoredAppSettings): Promise<void> {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }

  private getFilePath(): string {
    return join(this.options.appDataPath, `${this.options.appName}-app-settings.json`);
  }
}

/** 在加载业务服务前应用 userData，使 profile、扩展和代理池都落到同一个数据根目录。 */
export async function configureAppDataDirectory(app: AppPathAdapter): Promise<AppSettingsStore> {
  const appDataPath = app.getPath('appData');
  const defaultDataPath = app.isPackaged ? app.getPath('userData') : join(appDataPath, `${app.getName()}-dev`);
  const store = new AppSettingsStore({
    appDataPath,
    appName: app.getName(),
    defaultDataPath,
    getCurrentDataPath: () => app.getPath('userData')
  });
  const dataPath = await store.resolveStartupDataDirectory();
  mkdirSync(dataPath, { recursive: true });
  app.setPath('userData', dataPath);
  app.setPath('sessionData', dataPath);
  activeAppSettingsStore = store;
  return store;
}

/** IPC 注册阶段复用启动早期创建的设置存储，避免出现第二套状态。 */
export function getAppSettingsStore(): AppSettingsStore {
  if (!activeAppSettingsStore) {
    throw new Error('App settings store has not been configured.');
  }
  return activeAppSettingsStore;
}

function normalizePath(path: string): string {
  return resolve(path);
}
