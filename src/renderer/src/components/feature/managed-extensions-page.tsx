import { Button, Empty, Input, Popconfirm, Segmented, Switch, Tag, message as antdMessage } from 'antd';
import { FolderOpen, PackagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { ManagedExtension, ManagedExtensionEngine } from '../../../../shared/types';

/** 应用中心扩展管理页，负责导入、启停和删除本地全局扩展。 */
export function ManagedExtensionsPage(): JSX.Element {
  const [engine, setEngine] = useState<ManagedExtensionEngine>('chromium');
  const [name, setName] = useState('');
  const [extensions, setExtensions] = useState<readonly ManagedExtension[]>([]);
  const [loading, setLoading] = useState(false);

  const visibleExtensions = useMemo(
    () => extensions.filter((extension) => extension.engine === engine),
    [engine, extensions]
  );

  useEffect(() => {
    void refreshExtensions();
  }, []);

  async function refreshExtensions(): Promise<void> {
    setLoading(true);
    try {
      setExtensions(await window.browserShell.listManagedExtensions());
    } finally {
      setLoading(false);
    }
  }

  async function importPackage(): Promise<void> {
    const saved = await window.browserShell.importManagedExtensionPackage(engine, name);
    if (!saved) {
      return;
    }

    setName('');
    await refreshExtensions();
    void antdMessage.success('扩展包已导入');
  }

  async function importFolder(): Promise<void> {
    const saved = await window.browserShell.importManagedExtensionFolder(engine, name);
    if (!saved) {
      return;
    }

    setName('');
    await refreshExtensions();
    void antdMessage.success('扩展文件夹已导入');
  }

  async function toggleExtension(extension: ManagedExtension, enabled: boolean): Promise<void> {
    await window.browserShell.updateManagedExtension(extension.id, { enabled });
    await refreshExtensions();
  }

  async function deleteExtension(extension: ManagedExtension): Promise<void> {
    await window.browserShell.deleteManagedExtension(extension.id);
    await refreshExtensions();
    void antdMessage.success('扩展已删除');
  }

  return (
    <section className="flex flex-1 overflow-hidden bg-background">
      <div className="w-[360px] shrink-0 border-r bg-card p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">扩展管理</h2>
          <p className="mt-1 text-sm text-muted-foreground">导入本地扩展并按内核全局启用。</p>
        </div>
        <div className="grid gap-4">
          <Segmented
            block
            onChange={(value) => setEngine(value === 'firefox' ? 'firefox' : 'chromium')}
            options={[
              { label: 'Chromium', value: 'chromium' },
              { label: 'Firefox', value: 'firefox' }
            ]}
            value={engine}
          />
          <Input onChange={(event) => setName(event.target.value)} placeholder="显示名称，可留空" value={name} />
          <Button htmlType="button" onClick={() => void importPackage()} type="primary">
            <PackagePlus className="size-4" />导入扩展包
          </Button>
          <Button htmlType="button" onClick={() => void importFolder()}>
            <FolderOpen className="size-4" />导入文件夹
          </Button>
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">共 {visibleExtensions.length} 个扩展</div>
          <Button htmlType="button" loading={loading} onClick={() => void refreshExtensions()}>
            <RefreshCw className="size-4" />刷新
          </Button>
        </div>
        {visibleExtensions.length === 0 ? (
          <Empty description="暂无扩展" />
        ) : (
          <div className="grid gap-3">
            {visibleExtensions.map((extension) => (
              <article className="rounded-lg border bg-card p-4" key={extension.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{extension.name}</h3>
                      <Tag color={extension.exists ? 'green' : 'red'}>{extension.exists ? '文件存在' : '文件缺失'}</Tag>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{extension.fileName}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{extension.effectivePath}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch checked={extension.enabled} onChange={(checked) => void toggleExtension(extension, checked)} />
                    <Popconfirm description="删除后会同步清理 profile 禁用记录。" onConfirm={() => void deleteExtension(extension)} title="删除扩展？">
                      <Button danger htmlType="button" size="small">
                        <Trash2 className="size-4" />
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
