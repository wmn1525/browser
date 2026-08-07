import { Button, Modal, message as antdMessage } from 'antd';
import { useEffect, useState } from 'react';

import type { OrphanDataReport } from '../../../../shared/types';
import { confirmDelete } from '../../antd-confirm';
import { getErrorMessage } from '../../app-helpers';

interface RecycleBinOrphanDialogProps {
  readonly onCancel: () => void;
  readonly open: boolean;
}

/**
 * 残留数据弹窗：处理不属于任何环境（含回收站）的浏览器数据目录。
 * 这类目录没有 config.json，应用读不到，回收站也列不出来，只能靠扫描回收。
 */
export function RecycleBinOrphanDialog({ onCancel, open }: RecycleBinOrphanDialogProps): JSX.Element {
  const [report, setReport] = useState<OrphanDataReport>();
  const [status, setStatus] = useState('尚未扫描');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReport(undefined);
      setStatus('尚未扫描');
    }
  }, [open]);

  async function run(task: () => Promise<OrphanDataReport>, running: string, done: (report: OrphanDataReport) => string): Promise<void> {
    setBusy(true);
    setStatus(running);
    try {
      const next = await task();
      setReport(next);
      setStatus(done(next));
    } catch (error) {
      setStatus(`失败: ${getErrorMessage(error)}`);
      void antdMessage.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function scan(): Promise<void> {
    await run(
      () => window.browserShell.scanOrphanData(),
      '正在扫描...',
      (next) => next.count === 0 ? '没有发现残留数据' : `发现 ${next.count} 处，共 ${formatBytes(next.totalBytes)}`
    );
  }

  async function purge(): Promise<void> {
    if (!await confirmDelete('确认清理全部残留数据？', '这些目录已不属于任何环境（含回收站），清理后无法恢复。')) {
      return;
    }

    await run(
      () => window.browserShell.purgeOrphanData(),
      '正在清理...',
      (next) => `已清理 ${next.count} 处，回收 ${formatBytes(next.totalBytes)}`
    );
  }

  return (
    <Modal footer={null} onCancel={onCancel} open={open} title="残留数据">
      <p className="text-sm text-muted-foreground">
        早期版本删除环境时可能留下无主的浏览器数据目录。它们不属于任何环境（含回收站里的），
        应用平时读不到，只能在这里扫描回收。
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={busy} htmlType="button" onClick={() => void scan()}>扫描</Button>
        {report && report.count > 0 ? (
          <Button danger disabled={busy} htmlType="button" onClick={() => void purge()}>清理并回收</Button>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{status}</p>
    </Modal>
  );
}

/** 字节数转可读文本，让用户判断值不值得清。 */
function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
