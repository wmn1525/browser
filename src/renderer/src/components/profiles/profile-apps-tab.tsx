import { Chrome } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { ManagedExtension, ProfileDetail } from '../../../../shared/types';
import { getKernelEngine } from './browser-kernel-options';
import { Field, FormCard, Notice, SwitchRow } from './profile-form-fields';

interface AppsTabProps {
  readonly initialProfile?: ProfileDetail;
  readonly kernel: string;
  readonly loadImages: boolean;
  readonly loadVideos: boolean;
  readonly setLoadImages: (value: boolean) => void;
  readonly setLoadVideos: (value: boolean) => void;
}

/** Profile 应用配置页，允许当前 profile 屏蔽指定全局扩展。 */
export function AppsTab({
  initialProfile,
  kernel,
  loadImages,
  loadVideos,
  setLoadImages,
  setLoadVideos
}: AppsTabProps): JSX.Element {
  const [extensions, setExtensions] = useState<readonly ManagedExtension[]>([]);
  const engine = getKernelEngine(kernel);
  const visibleExtensions = useMemo(
    () => extensions.filter((extension) => extension.engine === engine),
    [engine, extensions]
  );
  const disabledIds = useMemo(
    () => new Set(initialProfile?.disabledGlobalExtensionIds ?? []),
    [initialProfile]
  );

  useEffect(() => {
    void window.browserShell.listManagedExtensions().then(setExtensions);
  }, []);

  return (
    <FormCard icon={<Chrome className="size-5" />} title="应用配置">
      <Field defaultValue={initialProfile?.startUrls.join('\n')} label="启动页" name="urls" placeholder="https://browserscan.net" />
      <SwitchRow checked={loadImages} label="图片加载" name="loadImages" onCheckedChange={setLoadImages} />
      <SwitchRow checked={loadVideos} label="视频加载" name="loadVideos" onCheckedChange={setLoadVideos} />
      <div className="grid grid-cols-[128px_1fr] items-start gap-3">
        <span className="pt-2 text-sm text-secondary">全局扩展</span>
        <div className="grid gap-2">
          {visibleExtensions.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">当前内核暂无全局扩展。</p>
          ) : visibleExtensions.map((extension) => (
            <label className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm" key={extension.id}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{extension.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{extension.fileName}</span>
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                禁用
                <input defaultChecked={disabledIds.has(extension.id)} name="disabledGlobalExtensionIds" type="checkbox" value={extension.id} />
              </span>
            </label>
          ))}
        </div>
      </div>
      <Notice>全局启用的扩展会随当前内核启动；勾选后仅在这个 profile 中禁用。</Notice>
    </FormCard>
  );
}
