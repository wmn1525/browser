import { app } from 'electron';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { OpenApiSettings } from '../shared/types';

/** 保存本地 Open API 的启用状态、端口和访问 Key。 */
export class OpenApiSettingsStore {
  /** 首次读取时自动生成 API Key，避免空 Key 暴露本地控制接口。 */
  public async get(): Promise<OpenApiSettings> {
    const current = await this.read();
    if (current) {
      return current;
    }

    const created = this.createDefault();
    await this.save(created);
    return created;
  }

  /** 更新启用状态或端口，Key 保持不变。 */
  public async update(update: Partial<Pick<OpenApiSettings, 'enabled' | 'port'>>): Promise<OpenApiSettings> {
    const current = await this.get();
    const next: OpenApiSettings = {
      ...current,
      enabled: update.enabled ?? current.enabled,
      port: normalizePort(update.port) ?? current.port
    };
    await this.save(next);
    return next;
  }

  /** 重生成 API Key 后立即持久化，已有外部脚本需要更新。 */
  public async regenerateKey(): Promise<OpenApiSettings> {
    const current = await this.get();
    const next: OpenApiSettings = {
      ...current,
      apiKey: createApiKey()
    };
    await this.save(next);
    return next;
  }

  private async read(): Promise<OpenApiSettings | undefined> {
    try {
      const parsed = JSON.parse(await readFile(this.getFilePath(), 'utf8')) as Partial<OpenApiSettings>;
      const port = normalizePort(parsed.port);
      const apiKey = typeof parsed.apiKey === 'string' && parsed.apiKey.trim() ? parsed.apiKey.trim() : undefined;
      if (!apiKey || !port) {
        return undefined;
      }
      return {
        enabled: parsed.enabled !== false,
        apiKey,
        port
      };
    } catch {
      return undefined;
    }
  }

  private async save(settings: OpenApiSettings): Promise<void> {
    const filePath = this.getFilePath();
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }

  private createDefault(): OpenApiSettings {
    return {
      enabled: true,
      apiKey: createApiKey(),
      port: 20081
    };
  }

  private getFilePath(): string {
    return join(app.getPath('userData'), 'open-api-settings.json');
  }
}

function normalizePort(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 65536 ? value : undefined;
}

function createApiKey(): string {
  return randomBytes(32).toString('base64url');
}
