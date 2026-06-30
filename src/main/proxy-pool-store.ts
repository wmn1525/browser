import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ProxyPoolItem } from '../shared/types';

/** 代理池本地存储，数据放在 Electron userData 下，随安装版用户数据保留。 */
export class ProxyPoolStore {
  /** 读取本地代理池；首次使用没有文件时返回空列表。 */
  async list(): Promise<readonly ProxyPoolItem[]> {
    try {
      const text = await readFile(this.getFilePath(), 'utf8');
      return JSON.parse(text) as readonly ProxyPoolItem[];
    } catch {
      return [];
    }
  }

  /** 保存完整代理池，renderer 已经完成增删改后的列表计算。 */
  async save(items: readonly ProxyPoolItem[]): Promise<void> {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  }

  private getFilePath(): string {
    return join(app.getPath('userData'), 'proxy-pool.json');
  }
}
