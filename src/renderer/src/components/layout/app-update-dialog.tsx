import { Download, RotateCcw, ShieldCheck } from 'lucide-react';

import type { AppUpdateEvent } from '../../../../shared/types';
import { Button } from '../ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

interface AppUpdateDialogProps {
  readonly event: AppUpdateEvent | undefined;
  readonly onDownload: () => void;
  readonly onInstall: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSkip: () => void;
  readonly open: boolean;
}

/** 应用升级弹窗，承接检查、下载、安装和跳过当前版本的完整闭环。 */
export function AppUpdateDialog({
  event,
  onDownload,
  onInstall,
  onOpenChange,
  onSkip,
  open
}: AppUpdateDialogProps): JSX.Element {
  const status = event?.status ?? 'checking';
  const update = event?.update;
  const progress = event?.progress?.percent ?? 0;
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(520px,calc(100vw-48px))]">
        <DialogTitle>{getDialogTitle(status, update?.version)}</DialogTitle>
        <DialogDescription>{getDialogDescription(event)}</DialogDescription>
        {status === 'downloading' ? (
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>下载进度</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
        {update?.releaseNotes ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs leading-5 whitespace-pre-wrap">
            {update.releaseNotes}
          </pre>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          {status === 'available' ? (
            <>
              <Button onClick={onSkip} type="button" variant="outline">跳过此版本</Button>
              <Button onClick={onDownload} type="button"><Download className="size-4" />立即下载</Button>
            </>
          ) : null}
          {status === 'downloaded' ? (
            <Button onClick={onInstall} type="button"><RotateCcw className="size-4" />重启安装</Button>
          ) : null}
          {status === 'not-available' || status === 'error' ? (
            <DialogClose asChild><Button type="button"><ShieldCheck className="size-4" />知道了</Button></DialogClose>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getDialogTitle(status: AppUpdateEvent['status'] | 'checking', version: string | undefined): string {
  if (status === 'available') return `发现新版本 ${version ?? ''}`;
  if (status === 'downloading') return `正在下载新版本 ${version ?? ''}`;
  if (status === 'downloaded') return `新版本 ${version ?? ''} 已就绪`;
  if (status === 'error') return '检查更新失败';
  if (status === 'not-available') return '当前已是最新版本';
  return '正在检查更新';
}

function getDialogDescription(event: AppUpdateEvent | undefined): string {
  if (event?.status === 'available') {
    return `当前版本 ${event.update?.currentVersion ?? '-'}，可升级到 ${event.update?.version ?? '-'}。`;
  }

  if (event?.status === 'downloaded') {
    return '安装包已下载完成，重启应用后会完成安装。';
  }

  if (event?.status === 'error') {
    return event.message ?? '请稍后重试，或确认发布目录可以访问 latest.yml。';
  }

  if (event?.status === 'not-available') {
    return `当前版本 ${event.update?.currentVersion ?? '-'}。`;
  }

  return '正在连接更新服务。';
}
