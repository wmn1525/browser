import { Button, Empty, message as antdMessage } from 'antd';
import { HardDrive, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { OrphanDataReport, ProfileSummary } from '../../../../shared/types';
import { confirmDelete } from '../../antd-confirm';
import { getErrorMessage } from '../../app-helpers';
import { RecycleBinTable } from './recycle-bin-table';

/** 回收站：已删除的环境只能恢复或彻底删除，不提供其它操作。 */
export function RecycleBinPage(): JSX.Element {
  const [profiles, setProfiles] = useState<readonly ProfileSummary[]>([]);
  const [orphan, setOrphan] = useState<OrphanDataReport>();
  const [status, setStatus] = useState('正在读取回收站...');
  const [busyId, setBusyId] = useState<string>();

  async function reload(): Promise<void> {
    setProfiles(await window.browserShell.listDeletedProfiles());
  }

  useEffect(() => {
    void reload().then(() => setStatus('准备就绪'));
    // 主进程的软删除、恢复、彻底删除都会广播，回收站跟着刷新，不需要自己轮询
    const unsubscribe = window.browserShell.onProfilesChanged(() => {
      void reload();
    });
    return unsubscribe;
  }, []);

  async function runTask(profileId: string, task: () => Promise<void>, done: string): Promise<void> {
    setBusyId(profileId);
    try {
      await task();
      await reload();
      setStatus(done);
    } catch (error) {
      setStatus(`操作失败: ${getErrorMessage(error)}`);
      void antdMessage.error(getErrorMessage(error));
    } finally {
      setBusyId(undefined);
    }
  }

  async function restore(profile: ProfileSummary): Promise<void> {
    await runTask(profile.id, () => window.browserShell.restoreProfile(profile.id), `已恢复: ${profile.name}`);
  }

  async function purge(profile: ProfileSummary): Promise<void> {
    const confirmed = await confirmDelete(
      `确认彻底删除「${profile.name}」？`,
      '会同时清空该环境的浏览器用户数据（登录态、Cookie、缓存），删除后无法恢复。'
    );
    if (!confirmed) {
      return;
    }

    await runTask(profile.id, () => window.browserShell.purgeProfile(profile.id), `已彻底删除: ${profile.name}`);
  }

  async function scanOrphan(): Promise<void> {
    setStatus('正在扫描残留数据...');
    try {
      const report = await window.browserShell.scanOrphanData();
      setOrphan(report);
      setStatus(report.count === 0 ? '没有发现残留数据' : `发现 ${report.count} 处残留数据`);
    } catch (error) {
      setStatus(`扫描失败: ${getErrorMessage(error)}`);
    }
  }

  async function purgeOrphan(): Promise<void> {
    if (!await confirmDelete('确认清理全部残留数据？', '这些目录已不属于任何环境（含回收站），清理后无法恢复。')) {
      return;
    }

    setStatus('正在清理残留数据...');
    try {
      const report = await window.browserShell.purgeOrphanData();
      setOrphan({ count: 0, totalBytes: 0 });
      setStatus(`已清理 ${report.count} 处残留数据，回收 ${formatBytes(report.totalBytes)}`);
      void antdMessage.success(`已回收 ${formatBytes(report.totalBytes)}`);
    } catch (error) {
      setStatus(`清理失败: ${getErrorMessage(error)}`);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
      <header>
        <h2 className="text-lg font-semibold">回收站</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          环境管理里删除的环境会先进入这里，数据仍保留在本地。回收站不会自动清空。
        </p>
      </header>

      {profiles.length === 0 ? (
        <Empty description="回收站是空的" />
      ) : (
        <RecycleBinTable busyId={busyId} onPurge={(profile) => void purge(profile)} onRestore={(profile) => void restore(profile)} profiles={profiles} />
      )}

      <OrphanPanel onPurge={() => void purgeOrphan()} onScan={() => void scanOrphan()} report={orphan} />
      <footer className="text-xs text-muted-foreground">{status}</footer>
    </section>
  );
}

/** 残留数据面板：处理历史遗留的无主目录，它们没有 config.json，回收站列不出来。 */
function OrphanPanel({ onPurge, onScan, report }: {
  readonly onPurge: () => void;
  readonly onScan: () => void;
  readonly report: OrphanDataReport | undefined;
}): JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium"><HardDrive className="size-4" />残留数据</div>
      <p className="mt-1 text-xs text-muted-foreground">
        早期版本删除环境时可能留下无主的浏览器数据目录，它们不属于任何环境（含回收站），只能在这里回收。
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Button htmlType="button" onClick={onScan} size="small">扫描</Button>
        {report ? (
          <>
            <span className="text-xs text-muted-foreground">
              {report.count === 0 ? '没有残留数据' : `${report.count} 处，共 ${formatBytes(report.totalBytes)}`}
            </span>
            {report.count > 0 ? (
              <Button danger htmlType="button" onClick={onPurge} size="small"><Trash2 className="size-4" />清理并回收</Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** 字节数转可读文本，回收站要让用户判断该先清哪个。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
