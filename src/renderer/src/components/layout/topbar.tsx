import { Button, Dropdown, type MenuProps } from 'antd';
import { Bell, Check, ChevronDown, Download, Mail, RefreshCw, UserCircle } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import type { BrowserKernelDownloadProgress, BrowserKernelInfo } from '../../../../shared/types';
import { browserKernelOptions } from '../profiles/browser-kernel-options';

interface TopbarProps {
  readonly downloadingKernelId: string | undefined;
  readonly kernelProgress: BrowserKernelDownloadProgress | undefined;
  readonly kernels: readonly BrowserKernelInfo[];
  readonly kernelStatus: string;
  readonly onAction: (action: string) => void;
  readonly onCheckUpdates: () => void;
  readonly onDownloadKernel: (kernelId: string) => void;
  readonly onRefresh: () => void;
  readonly title: string;
}

const emptyMenuItems: MenuProps['items'] = [];

/** 顶部工具栏，所有图标都给出明确操作反馈。 */
export function Topbar({ downloadingKernelId, kernelProgress, kernels, kernelStatus, onAction, onCheckUpdates, onDownloadKernel, onRefresh, title }: TopbarProps): JSX.Element {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <HeaderIcon onClick={() => onAction('消息中心待接入')} title="消息"><Mail className="size-5" /></HeaderIcon>
        <HeaderIcon onClick={onRefresh} title="刷新"><RefreshCw className="size-5" /></HeaderIcon>
        <DownloadMenu downloadingKernelId={downloadingKernelId} kernelProgress={kernelProgress} kernels={kernels} kernelStatus={kernelStatus} onDownloadKernel={onDownloadKernel} />
        <HeaderIcon onClick={() => onAction('暂无新通知')} title="通知"><Bell className="size-5" /></HeaderIcon>
        <AccountMenu onAction={onAction} onCheckUpdates={onCheckUpdates} />
      </div>
    </header>
  );
}

function HeaderIcon({
  children,
  onClick,
  title
}: PropsWithChildren<{ readonly onClick: () => void; readonly title: string }>): JSX.Element {
  return (
    <Button className="h-9 w-9 p-0" htmlType="button" onClick={onClick} title={title} type="text">
      {children}
    </Button>
  );
}

function DownloadMenu({ downloadingKernelId, kernelProgress, kernels, kernelStatus, onDownloadKernel }: {
  readonly downloadingKernelId: string | undefined;
  readonly kernelProgress: BrowserKernelDownloadProgress | undefined;
  readonly kernels: readonly BrowserKernelInfo[];
  readonly kernelStatus: string;
  readonly onDownloadKernel: (kernelId: string) => void;
}): JSX.Element {
  const kernelOptions = browserKernelOptions.filter((kernel) => kernel.id !== 'system-chrome' && kernel.id !== 'system-firefox');
  const firefoxOptions = kernelOptions.filter((kernel) => kernel.engine === 'firefox');
  const chromeOptions = kernelOptions.filter((kernel) => kernel.engine === 'chromium');
  const progressPercent = kernelProgress?.percent ?? 0;
  return (
    <Dropdown
      menu={{ items: emptyMenuItems }}
      popupRender={() => (
        <div className="max-h-[560px] w-[520px] overflow-y-auto rounded-lg border bg-card p-2 shadow-lg">
          <div className="mb-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{kernelStatus}</div>
          <div className="my-2 h-px bg-border" />
          <KernelDownloadGroup downloadingKernelId={downloadingKernelId} kernelProgress={kernelProgress} kernels={kernels} onDownloadKernel={onDownloadKernel} options={firefoxOptions} title="Firefox / Gecko" />
          <div className="my-2 h-px bg-border" />
          <KernelDownloadGroup downloadingKernelId={downloadingKernelId} kernelProgress={kernelProgress} kernels={kernels} onDownloadKernel={onDownloadKernel} options={chromeOptions} title="Chrome / Chromium" />
        </div>
      )}
      trigger={['click']}
    >
      <Button className="relative overflow-visible" htmlType="button" title="下载内核">
        <Download className="size-4" />
        下载内核
        <ChevronDown className="size-4 opacity-60" />
        {downloadingKernelId ? (
          <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold leading-5 text-white">
            {progressPercent}%
          </span>
        ) : null}
        {downloadingKernelId ? (
          <span className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-emerald-100">
            <span className="block h-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
          </span>
        ) : null}
      </Button>
    </Dropdown>
  );
}

function KernelDownloadGroup({ downloadingKernelId, kernelProgress, kernels, onDownloadKernel, options, title }: {
  readonly downloadingKernelId: string | undefined;
  readonly kernelProgress: BrowserKernelDownloadProgress | undefined;
  readonly kernels: readonly BrowserKernelInfo[];
  readonly onDownloadKernel: (kernelId: string) => void;
  readonly options: readonly (typeof browserKernelOptions)[number][];
  readonly title: string;
}): JSX.Element {
  return (
    <section className="py-1">
      <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-semibold uppercase text-muted-foreground">
        <span>{title}</span>
        <span>{options.length} 个版本</span>
      </div>
      <div className="grid gap-1">
        {options.map((kernel) => (
          <KernelDownloadRow
            downloading={downloadingKernelId === kernel.id}
            key={kernel.id}
            onDownload={() => onDownloadKernel(kernel.id)}
            option={kernel}
            progress={kernelProgress?.kernelId === kernel.id ? kernelProgress : undefined}
            state={kernels.find((item) => item.id === kernel.id)}
          />
        ))}
      </div>
    </section>
  );
}

function KernelDownloadRow({ downloading, onDownload, option, progress, state }: {
  readonly downloading: boolean;
  readonly onDownload: () => void;
  readonly option: (typeof browserKernelOptions)[number];
  readonly progress: BrowserKernelDownloadProgress | undefined;
  readonly state: BrowserKernelInfo | undefined;
}): JSX.Element {
  const installed = state?.isInstalled ?? false;
  const version = state?.version ?? option.version;
  return (
    <div className="grid grid-cols-[1fr_104px] items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted">
      <span className={installed ? 'min-w-0' : 'min-w-0 text-muted-foreground'}>
        <span className="block truncate font-medium">{option.label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{version} · {option.description}</span>
      </span>
      {installed ? (
        <span className="flex justify-end gap-1 text-[11px] text-primary"><Check className="size-3.5" />已下载</span>
      ) : downloading ? (
        <span className="w-full">
          <span className="mb-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{getProgressLabel(progress?.phase)}</span>
            <span>{progress?.percent ?? 0}%</span>
          </span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full bg-primary" style={{ width: `${progress?.percent ?? 0}%` }} />
          </span>
        </span>
      ) : (
        <Button className="justify-self-end" disabled={downloading} htmlType="button" onClick={onDownload} size="small">
          <Download className="size-3.5" />{downloading ? '下载中' : '下载'}
        </Button>
      )}
    </div>
  );
}

function getProgressLabel(phase: BrowserKernelDownloadProgress['phase'] | undefined): string {
  if (phase === 'downloaded') return '下载完成';
  if (phase === 'extracting') return '解压中';
  if (phase === 'completed') return '解压完成';
  return '下载中';
}

function AccountMenu({ onAction, onCheckUpdates }: {
  readonly onAction: (action: string) => void;
  readonly onCheckUpdates: () => void;
}): JSX.Element {
  const items: MenuProps['items'] = [
    { key: 'settings', icon: <UserCircle className="size-4" />, label: '账号设置' },
    { key: 'team', label: '团队权限' },
    { key: 'logs', label: '操作日志' },
    { type: 'divider' },
    { key: 'updates', icon: <RefreshCw className="size-4" />, label: '检查更新' }
  ];

  function handleMenuClick({ key }: { readonly key: string }): void {
    if (key === 'settings') onAction('账号设置待接入');
    if (key === 'team') onAction('团队权限待接入');
    if (key === 'logs') onAction('操作日志待接入');
    if (key === 'updates') onCheckUpdates();
  }

  return (
    <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
      <button className="ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted" type="button">
        <div className="grid size-8 place-items-center rounded-full bg-teal-500 text-xs font-bold text-white">AD</div>
        <div className="text-left text-xs">
          <strong className="block">admin</strong>
          <span className="text-muted-foreground">企业管理员</span>
        </div>
      </button>
    </Dropdown>
  );
}
