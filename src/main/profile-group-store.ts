import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ProfileGroup } from '../shared/types';

/** 本地 profile 分组存储，仅写入当前机器的 Electron userData。 */
export class ProfileGroupStore {
  /** 读取本地分组；首次使用没有文件时返回空列表。 */
  async list(): Promise<readonly ProfileGroup[]> {
    try {
      const text = await readFile(this.getFilePath(), 'utf8');
      return JSON.parse(text) as readonly ProfileGroup[];
    } catch {
      return [];
    }
  }

  /** 保存完整分组列表，renderer 负责计算新增、重命名和删除后的最终状态。 */
  async save(groups: readonly ProfileGroup[]): Promise<void> {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(groups, null, 2)}\n`, 'utf8');
  }

  private getFilePath(): string {
    return join(app.getPath('userData'), 'profile-groups.json');
  }
}
