import { useEffect, useState } from 'react';

import type { AppUpdateEvent } from '../../../shared/types';

const SKIPPED_UPDATE_VERSION_KEY = 'imrun.skippedUpdateVersion';

interface AppUpdateState {
  readonly event: AppUpdateEvent | undefined;
  readonly open: boolean;
  readonly checkForUpdates: () => Promise<void>;
  readonly downloadUpdate: () => Promise<void>;
  readonly installUpdate: () => Promise<void>;
  readonly setOpen: (open: boolean) => void;
  readonly skipVersion: () => void;
}

/** 管理应用升级 UI 状态，并在本地记录用户跳过的版本。 */
export function useAppUpdates(setStatus: (status: string) => void): AppUpdateState {
  const [event, setEvent] = useState<AppUpdateEvent>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return window.browserShell.onAppUpdateEvent((nextEvent) => {
      handleUpdateEvent(nextEvent, false);
    });
  }, []);

  async function checkForUpdates(): Promise<void> {
    setStatus('正在检查应用更新...');
    const result = await window.browserShell.checkForAppUpdates();
    handleUpdateEvent(result, true);
  }

  async function downloadUpdate(): Promise<void> {
    setStatus('正在下载应用更新...');
    const result = await window.browserShell.downloadAppUpdate();
    handleUpdateEvent(result, true);
  }

  async function installUpdate(): Promise<void> {
    setStatus('正在重启并安装更新...');
    await window.browserShell.installAppUpdate();
  }

  function skipVersion(): void {
    const version = event?.update?.version;
    if (!version) {
      setOpen(false);
      return;
    }

    window.localStorage.setItem(SKIPPED_UPDATE_VERSION_KEY, version);
    setStatus(`已跳过版本 ${version}`);
    setOpen(false);
  }

  function handleUpdateEvent(nextEvent: AppUpdateEvent, manual: boolean): void {
    setEvent(nextEvent);
    setStatus(getStatusText(nextEvent));

    if (nextEvent.status === 'available' && shouldShowAvailableUpdate(nextEvent, manual)) {
      setOpen(true);
      return;
    }

    if (nextEvent.status === 'downloaded') {
      setOpen(true);
      return;
    }

    if (manual && (nextEvent.status === 'not-available' || nextEvent.status === 'error')) {
      setOpen(true);
    }
  }

  return {
    checkForUpdates,
    downloadUpdate,
    event,
    installUpdate,
    open,
    setOpen,
    skipVersion
  };
}

/** 自动检查时尊重跳过版本，手动检查始终展示检测结果。 */
function shouldShowAvailableUpdate(event: AppUpdateEvent, manual: boolean): boolean {
  if (manual) {
    return true;
  }

  const version = event.update?.version;
  return Boolean(version && window.localStorage.getItem(SKIPPED_UPDATE_VERSION_KEY) !== version);
}

function getStatusText(event: AppUpdateEvent): string {
  if (event.status === 'checking') return '正在检查应用更新...';
  if (event.status === 'available') return `检测到新版本 ${event.update?.version ?? ''}`;
  if (event.status === 'downloading') return `正在下载更新 ${event.progress?.percent ?? 0}%`;
  if (event.status === 'downloaded') return `新版本 ${event.update?.version ?? ''} 已下载`;
  if (event.status === 'error') return event.message ?? '应用更新失败';
  return '当前已是最新版本';
}
