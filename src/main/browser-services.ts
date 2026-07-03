import { BrowserEngine } from '../core/browser-engine';
import { removeExtensionStorage } from '../core/extension-manager';
import type { OpenApiInfo } from '../shared/types';
import { LocalApiServer } from './local-api-server';
import { ManagedExtensionStore } from './managed-extension-store';
import { OpenApiSettingsStore } from './open-api-settings-store';
import { ProfileGroupStore } from './profile-group-store';
import { ProxyPoolStore } from './proxy-pool-store';
import { WindowSyncService } from './window-sync-service';

export const managedExtensionStore = new ManagedExtensionStore();
export const browserEngine = new BrowserEngine({
  listManagedExtensions: () => managedExtensionStore.list()
});
export const profileGroupStore = new ProfileGroupStore();
export const proxyPoolStore = new ProxyPoolStore();
export const openApiSettingsStore = new OpenApiSettingsStore();
export const windowSyncService = new WindowSyncService({
  listProfiles: () => browserEngine.listWindowSyncProfiles()
});

export const localApiServer = new LocalApiServer({
  getSettings: () => openApiSettingsStore.get(),
  browser: browserEngine,
  groups: profileGroupStore,
  proxies: proxyPoolStore,
  extensions: {
    list: () => managedExtensionStore.list(),
    update: (extensionId, update) => managedExtensionStore.update(extensionId, update),
    delete: deleteManagedExtension
  }
});

/** 删除扩展时同时清理文件和 profile 中残留的禁用 id。 */
export async function deleteManagedExtension(extensionId: string): Promise<void> {
  const deleted = await managedExtensionStore.delete(extensionId);
  removeExtensionStorage(managedExtensionStore.getExtensionsRoot(), deleted.engine, extensionId);
  await browserEngine.removeDisabledExtensionId(extensionId);
}

/** 启用设置并启动本地 Open API 服务。 */
export async function startOpenApiServer(): Promise<OpenApiInfo> {
  await openApiSettingsStore.update({ enabled: true });
  return localApiServer.start();
}

/** 停止本地 Open API 服务并持久化关闭状态。 */
export async function stopOpenApiServer(): Promise<OpenApiInfo> {
  await openApiSettingsStore.update({ enabled: false });
  return localApiServer.stop();
}

/** 重新生成访问 Key，并返回最新服务状态。 */
export async function regenerateOpenApiKey(): Promise<OpenApiInfo> {
  await openApiSettingsStore.regenerateKey();
  return localApiServer.getInfo();
}
