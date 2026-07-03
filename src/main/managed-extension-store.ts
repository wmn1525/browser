import { app } from 'electron';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { ManagedExtension, ManagedExtensionUpdate } from '../shared/types';

/** 管理应用中心扩展元数据，扩展文件本体由 core 层导入服务维护。 */
export class ManagedExtensionStore {
  /** 读取扩展列表，并用当前文件系统状态刷新 exists 字段。 */
  public async list(): Promise<readonly ManagedExtension[]> {
    const items = await this.readItems();
    return items.map((item) => this.withExists(item));
  }

  /** 新增扩展元数据，导入文件已经在调用方完成。 */
  public async append(item: ManagedExtension): Promise<ManagedExtension> {
    const items = await this.readItems();
    await this.saveItems([item, ...items]);
    return this.withExists(item);
  }

  /** 只允许更新显示名和启用状态，路径字段由导入流程维护。 */
  public async update(extensionId: string, update: ManagedExtensionUpdate): Promise<ManagedExtension> {
    const items = await this.readItems();
    let updated: ManagedExtension | undefined;
    const nextItems = items.map((item) => {
      if (item.id !== extensionId) {
        return item;
      }

      updated = {
        ...item,
        name: update.name?.trim() || item.name,
        enabled: update.enabled ?? item.enabled,
        updatedAt: new Date().toISOString()
      };
      return updated;
    });

    if (!updated) {
      throw new Error(`扩展不存在: ${extensionId}`);
    }

    await this.saveItems(nextItems);
    return this.withExists(updated);
  }

  /** 删除扩展元数据并返回被删除项，调用方负责清理文件目录。 */
  public async delete(extensionId: string): Promise<ManagedExtension> {
    const items = await this.readItems();
    const deleted = items.find((item) => item.id === extensionId);
    if (!deleted) {
      throw new Error(`扩展不存在: ${extensionId}`);
    }

    await this.saveItems(items.filter((item) => item.id !== extensionId));
    return deleted;
  }

  /** 扩展文件统一存放在 userData，避免进入源码目录。 */
  public getExtensionsRoot(): string {
    return join(app.getPath('userData'), 'extensions');
  }

  private async readItems(): Promise<readonly ManagedExtension[]> {
    try {
      return JSON.parse(await readFile(this.getFilePath(), 'utf8')) as readonly ManagedExtension[];
    } catch {
      return [];
    }
  }

  private async saveItems(items: readonly ManagedExtension[]): Promise<void> {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  }

  private withExists(item: ManagedExtension): ManagedExtension {
    return { ...item, exists: existsSync(item.effectivePath) };
  }

  private getFilePath(): string {
    return join(app.getPath('userData'), 'managed-extensions.json');
  }
}
