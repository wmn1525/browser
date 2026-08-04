import { Button, Empty, message as antdMessage } from 'antd';
import { HardDrive, ListChecks, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProfileSummary } from '../../../../shared/types';
import { confirmDelete } from '../../antd-confirm';
import { getErrorMessage } from '../../app-helpers';
import { RecycleBinOrphanDialog } from './recycle-bin-orphan-dialog';
import { RecycleBinTable } from './recycle-bin-table';

/** 回收站：已删除的环境只能恢复或彻底删除，支持多选批量处理。 */
export function RecycleBinPage(): JSX.Element {
  const [profiles, setProfiles] = useState<readonly ProfileSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [status, setStatus] = useState('正在读取回收站...');
  const [busy, setBusy] = useState(false);
  const [orphanOpen, setOrphanOpen] = useState(false);

  async function reload(): Promise<void> {
    const next = await window.browserShell.listDeletedProfiles();
    setProfiles(next);
    setSelectedIds((ids) => ids.filter((id) => next.some((profile) => profile.id === id)));
  }

  useEffect(() => {
    void reload().then(() => setStatus('准备就绪'));
    // 主进程的软删除、恢复、彻底删除都会广播，回收站跟着刷新，不需要自己轮询
    const unsubscribe = window.browserShell.onProfilesChanged(() => {
      void reload();
    });
    return unsubscribe;
  }, []);

  /** 批量接口整批只广播一次，界面不会被逐条刷新拖住。 */
  async function run(task: () => Promise<void>, running: string, done: string): Promise<void> {
    setBusy(true);
    setStatus(running);
    try {
      await task();
      await reload();
      setStatus(done);
    } catch (error) {
      await reload();
      setStatus(`操作失败: ${getErrorMessage(error)}`);
      void antdMessage.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function restore(profileIds: readonly string[]): Promise<void> {
    await run(
      () => window.browserShell.restoreProfiles(profileIds),
      `正在恢复 ${profileIds.length} 个环境...`,
      `已恢复 ${profileIds.length} 个环境`
    );
  }

  async function purge(profileIds: readonly string[], label: string): Promise<void> {
    const confirmed = await confirmDelete(
      `确认彻底删除${label}？`,
      '会同时清空这些环境的浏览器用户数据（登录态、Cookie、缓存），删除后无法恢复。'
    );
    if (!confirmed) {
      return;
    }

    await run(
      () => window.browserShell.purgeProfiles(profileIds),
      `正在彻底删除 ${profileIds.length} 个环境...`,
      `已彻底删除 ${profileIds.length} 个环境`
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
      <header className="mb-3">
        <h2 className="text-lg font-semibold">回收站</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          环境管理里删除的环境会先进入这里，数据仍保留在本地。回收站不会自动清空。
        </p>
      </header>

      <Toolbar
        busy={busy}
        onClear={() => setSelectedIds([])}
        onOpenOrphan={() => setOrphanOpen(true)}
        onPurge={() => void purge(selectedIds, `选中的 ${selectedIds.length} 个环境`)}
        onRestore={() => void restore(selectedIds)}
        onSelectAll={() => setSelectedIds(profiles.map((profile) => profile.id))}
        selectedCount={selectedIds.length}
        totalCount={profiles.length}
      />

      {profiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border bg-card"><Empty description="回收站是空的" /></div>
      ) : (
        <RecycleBinTable
          busy={busy}
          onPurge={(profile) => void purge([profile.id], `「${profile.name}」`)}
          onRestore={(profile) => void restore([profile.id])}
          onSelectedIdsChange={setSelectedIds}
          profiles={profiles}
          selectedIds={selectedIds}
        />
      )}

      <footer className="mt-3 text-xs text-muted-foreground">{status}</footer>
      <RecycleBinOrphanDialog onCancel={() => setOrphanOpen(false)} open={orphanOpen} />
    </section>
  );
}

/** 批量工具栏；残留数据入口固定在右侧，与选择操作放在同一行。 */
function Toolbar({ busy, onClear, onOpenOrphan, onPurge, onRestore, onSelectAll, selectedCount, totalCount }: {
  readonly busy: boolean;
  readonly onClear: () => void;
  readonly onOpenOrphan: () => void;
  readonly onPurge: () => void;
  readonly onRestore: () => void;
  readonly onSelectAll: () => void;
  readonly selectedCount: number;
  readonly totalCount: number;
}): JSX.Element {
  const hasSelection = selectedCount > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">已选择 {selectedCount} / {totalCount} 个环境</span>
        {selectedCount < totalCount ? (
          <Button htmlType="button" onClick={onSelectAll} size="small" type="link">
            <ListChecks className="size-4" />选择全部 {totalCount} 个
          </Button>
        ) : null}
        {hasSelection ? (
          <Button htmlType="button" onClick={onClear} size="small" type="link"><X className="size-4" />清空选择</Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button disabled={busy || !hasSelection} htmlType="button" onClick={onRestore} size="small" type="primary">
          <RotateCcw className="size-4" />一键恢复
        </Button>
        <Button danger disabled={busy || !hasSelection} htmlType="button" onClick={onPurge} size="small">
          <Trash2 className="size-4" />一键清空
        </Button>
        <Button htmlType="button" onClick={onOpenOrphan} size="small"><HardDrive className="size-4" />残留数据</Button>
      </div>
    </div>
  );
}
