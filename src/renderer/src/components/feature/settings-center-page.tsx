import { Button, Tag, message as antdMessage } from 'antd';
import { Copy, FolderInput, FolderOpen, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AppDataDirectoryInfo } from '../../../../shared/types';

/** 设置中心当前聚焦本机数据目录，便于用户定位和手动迁移后切换。 */
export function SettingsCenterPage(): JSX.Element {
  const [info, setInfo] = useState<AppDataDirectoryInfo>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshInfo();
  }, []);

  async function refreshInfo(): Promise<void> {
    setLoading(true);
    try {
      setInfo(await window.browserShell.getAppDataDirectoryInfo());
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string): Promise<void> {
    await navigator.clipboard?.writeText(value);
    void antdMessage.success('已复制');
  }

  async function openCurrentDirectory(): Promise<void> {
    await window.browserShell.openAppDataDirectory();
  }

  async function chooseDataDirectory(): Promise<void> {
    setLoading(true);
    try {
      const nextInfo = await window.browserShell.chooseAppDataDirectory();
      setInfo(nextInfo);
      void antdMessage.success(nextInfo.restartRequired ? '重启后使用新的数据文件夹' : '数据文件夹未改变');
    } finally {
      setLoading(false);
    }
  }

  async function resetDataDirectory(): Promise<void> {
    setLoading(true);
    try {
      const nextInfo = await window.browserShell.resetAppDataDirectory();
      setInfo(nextInfo);
      void antdMessage.success(nextInfo.restartRequired ? '重启后恢复默认数据文件夹' : '已使用默认数据文件夹');
    } finally {
      setLoading(false);
    }
  }

  const currentPath = info?.currentPath ?? '加载中';
  const nextStartPath = info?.nextStartPath ?? currentPath;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-auto bg-background p-6">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">设置中心</h2>
                {info?.restartRequired ? <Tag color="orange">重启后生效</Tag> : <Tag color="green">当前生效</Tag>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">数据文件夹保存 profile、分组、代理池、扩展和本地 API 设置。</p>
            </div>
            <Button htmlType="button" loading={loading} onClick={() => void refreshInfo()}>
              <RefreshCw className="size-4" />刷新
            </Button>
          </div>

          <div className="grid gap-4">
            <PathRow label="当前数据文件夹" onCopy={() => void copyText(currentPath)} onOpen={() => void openCurrentDirectory()} value={currentPath} />
            <PathRow label="下次启动使用" onCopy={() => void copyText(nextStartPath)} value={nextStartPath} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button htmlType="button" loading={loading} onClick={() => void chooseDataDirectory()} type="primary">
              <FolderInput className="size-4" />选择迁移后目录
            </Button>
            <Button htmlType="button" onClick={() => void openCurrentDirectory()}>
              <FolderOpen className="size-4" />打开当前文件夹
            </Button>
            <Button htmlType="button" loading={loading} onClick={() => void resetDataDirectory()}>
              <RotateCcw className="size-4" />恢复默认
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">手动迁移时，先关闭应用并移动数据文件夹，再在这里选择迁移后的目录。</p>
        </div>
      </div>
    </section>
  );
}

function PathRow({ label, onCopy, onOpen, value }: {
  readonly label: string;
  readonly onCopy: () => void;
  readonly onOpen?: () => void;
  readonly value: string;
}): JSX.Element {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/50 p-3">
        <code className="min-w-0 flex-1 truncate text-sm">{value}</code>
        {onOpen ? <Button htmlType="button" onClick={onOpen} size="small" type="text"><FolderOpen className="size-4" /></Button> : null}
        <Button htmlType="button" onClick={onCopy} size="small" type="text"><Copy className="size-4" /></Button>
      </div>
    </div>
  );
}
