import { useEffect, useState } from 'react';

import type { BrowserKernelDownloadProgress, BrowserKernelInfo } from '../../../shared/types';
import { getKernelLabel } from '../components/profiles/browser-kernel-options';

export interface BrowserKernelState {
  readonly downloadingKernelId: string | undefined;
  readonly downloadKernel: (kernelId: string) => Promise<void>;
  readonly kernelProgress: BrowserKernelDownloadProgress | undefined;
  readonly kernels: readonly BrowserKernelInfo[];
  readonly kernelStatus: string;
}

/** 管理顶部内核下载状态、安装列表和进度事件。 */
export function useBrowserKernels(setShellStatus: (status: string) => void): BrowserKernelState {
  const [kernels, setKernels] = useState<readonly BrowserKernelInfo[]>([]);
  const [kernelStatus, setKernelStatus] = useState('内核下载');
  const [downloadingKernelId, setDownloadingKernelId] = useState<string>();
  const [kernelProgress, setKernelProgress] = useState<BrowserKernelDownloadProgress>();

  async function refreshKernels(): Promise<void> {
    setKernels(await window.browserShell.listBrowserKernels());
  }

  async function downloadKernel(kernelId: string): Promise<void> {
    const label = getKernelLabel(kernelId);
    setDownloadingKernelId(kernelId);
    setKernelProgress({ kernelId, phase: 'downloading', percent: 0, receivedBytes: 0 });
    setKernelStatus(`正在下载 ${label}...`);
    setShellStatus(`正在下载 ${label} 内核...`);
    try {
      const result = await window.browserShell.downloadBrowserKernel(kernelId);
      setKernelStatus(result.message);
      setShellStatus(`${result.message}: ${result.kernel.version}`);
      await refreshKernels();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setKernelStatus(`下载失败: ${message}`);
      setShellStatus(`内核下载失败: ${message}`);
    } finally {
      setDownloadingKernelId(undefined);
    }
  }

  useEffect(() => {
    void refreshKernels();
    return window.browserShell.onBrowserKernelDownloadProgress((progress) => {
      setKernelProgress(progress);
      if (progress.phase === 'downloaded') {
        setKernelStatus(`${getKernelLabel(progress.kernelId)} 下载完成`);
        return;
      }
      if (progress.phase === 'extracting') {
        setKernelStatus(`${getKernelLabel(progress.kernelId)} 解压中...`);
        return;
      }
      if (progress.phase === 'completed') {
        setKernelStatus(`${getKernelLabel(progress.kernelId)} 解压完成`);
        return;
      }
      setKernelStatus(`${getKernelLabel(progress.kernelId)} ${progress.percent}%`);
    });
  }, []);

  return { downloadingKernelId, downloadKernel, kernelProgress, kernels, kernelStatus };
}
