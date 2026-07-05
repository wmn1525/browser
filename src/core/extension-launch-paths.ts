import type { BrowserKernelEngine, ManagedExtension } from '../shared/types';

/** 根据内核和 profile 禁用列表选出本次启动需要加载的扩展路径。 */
export function getEnabledExtensionPaths(
  extensions: readonly ManagedExtension[],
  engine: BrowserKernelEngine,
  disabledIds: readonly string[]
): readonly string[] {
  const disabled = new Set(disabledIds);
  return extensions
    .filter((extension) => extension.engine === engine)
    .filter((extension) => extension.enabled && extension.exists)
    .filter((extension) => !disabled.has(extension.id))
    .map((extension) => extension.effectivePath);
}
