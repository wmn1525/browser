import { Button, Checkbox, Empty, Switch, Tag, message as antdMessage } from 'antd';
import { Monitor, Play, RefreshCw, RotateCw, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { WindowSyncOptions, WindowSyncProfile, WindowSyncSession, WindowSyncStartRequest } from '../../../../shared/window-sync-types';

const defaultOptions: WindowSyncOptions = {
  syncNavigation: true,
  syncClick: true,
  syncInput: true,
  syncScroll: true,
  syncKeyboard: true,
  syncMouseMove: true,
  syncCurrentUrlOnStart: true
};

const optionItems: readonly { readonly key: keyof WindowSyncOptions; readonly label: string }[] = [
  { key: 'syncNavigation', label: '页面跳转' },
  { key: 'syncClick', label: '点击' },
  { key: 'syncInput', label: '输入' },
  { key: 'syncScroll', label: '滚动' },
  { key: 'syncKeyboard', label: '键盘' },
  { key: 'syncMouseMove', label: '鼠标轨迹' },
  { key: 'syncCurrentUrlOnStart', label: '启动同步网址' }
];

const emptySession: WindowSyncSession = {
  running: false,
  followerProfileIds: [],
  connectedFollowers: 0
};

/** 窗口同步页，参考 Open-Anti-Browser 同步器的主控、跟随和同步选项结构。 */
export function WindowSyncPage(): JSX.Element {
  const [profiles, setProfiles] = useState<readonly WindowSyncProfile[]>([]);
  const [session, setSession] = useState<WindowSyncSession>(emptySession);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [masterId, setMasterId] = useState('');
  const [options, setOptions] = useState<WindowSyncOptions>(defaultOptions);
  const [loading, setLoading] = useState(false);

  const runningProfiles = useMemo(() => profiles.filter((profile) => profile.isRunning), [profiles]);
  const selectedProfiles = useMemo(
    () => runningProfiles.filter((profile) => selectedIds.includes(profile.id)),
    [runningProfiles, selectedIds]
  );
  const effectiveMasterId = masterId || selectedIds[0] || '';
  const followerIds = selectedIds.filter((id) => id !== effectiveMasterId);
  const canStart = Boolean(effectiveMasterId) && followerIds.length > 0;

  useEffect(() => {
    void refreshAll();
    return window.browserShell.onProfilesChanged(() => {
      void refreshAll();
    });
  }, []);

  async function refreshAll(): Promise<void> {
    const [nextProfiles, nextSession] = await Promise.all([
      window.browserShell.listWindowSyncProfiles(),
      window.browserShell.getWindowSyncSession()
    ]);
    setProfiles(nextProfiles);
    setSession(nextSession);
    setSelectedIds((ids) => ids.filter((id) => nextProfiles.some((profile) => profile.id === id && profile.isRunning)));
    if (nextSession.options) {
      setOptions(nextSession.options);
    }
  }

  async function startSync(): Promise<void> {
    await runSyncTask(() => window.browserShell.startWindowSync(toStartRequest()), '窗口同步已启动');
  }

  async function stopSync(): Promise<void> {
    await runSyncTask(() => window.browserShell.stopWindowSync(), '窗口同步已停止');
  }

  async function restartSync(): Promise<void> {
    await runSyncTask(() => window.browserShell.restartWindowSync(toStartRequest()), '窗口同步已重启');
  }

  async function runSyncTask(task: () => Promise<WindowSyncSession>, done: string): Promise<void> {
    setLoading(true);
    try {
      setSession(await task());
      void antdMessage.success(done);
    } catch (error) {
      void antdMessage.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
      void refreshAll();
    }
  }

  function toStartRequest(): WindowSyncStartRequest {
    return {
      masterProfileId: effectiveMasterId,
      followerProfileIds: followerIds,
      options
    };
  }

  function toggleProfile(profileId: string, checked: boolean): void {
    setSelectedIds((ids) => {
      const nextIds = checked ? Array.from(new Set([...ids, profileId])) : ids.filter((id) => id !== profileId);
      if (checked && !effectiveMasterId) {
        setMasterId(profileId);
      }
      if (!nextIds.includes(masterId)) {
        setMasterId(nextIds[0] ?? '');
      }
      return nextIds;
    });
  }

  function markMaster(profileId: string): void {
    setMasterId(profileId);
    setSelectedIds((ids) => Array.from(new Set([...ids, profileId])));
  }

  function toggleOption(key: keyof WindowSyncOptions, checked: boolean): void {
    setOptions((current) => ({ ...current, [key]: checked }));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="shrink-0 border-b bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">窗口同步</h2>
            <p className="mt-1 text-sm text-muted-foreground">主控窗口的页面、点击、输入、滚动和键盘事件会分发到跟随窗口。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canStart} htmlType="button" loading={loading} onClick={() => void startSync()} type="primary">
              <Play className="size-4" />启动
            </Button>
            <Button disabled={!session.running || !canStart} htmlType="button" loading={loading} onClick={() => void restartSync()}>
              <RotateCw className="size-4" />重启
            </Button>
            <Button disabled={!session.running} htmlType="button" loading={loading} onClick={() => void stopSync()}>
              <Square className="size-4" />停止
            </Button>
            <Button htmlType="button" onClick={() => void refreshAll()}>
              <RefreshCw className="size-4" />刷新
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="运行中的窗口" value={runningProfiles.length.toString()} />
          <Metric label="已选窗口" value={selectedProfiles.length.toString()} />
          <Metric label="跟随窗口" value={followerIds.length.toString()} />
          <Metric label="状态" value={session.running ? '同步中' : '未启动'} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">运行中的窗口</h3>
            <Tag color={session.running ? 'green' : 'default'}>{session.running ? '已连接' : '空闲'}</Tag>
          </div>
          {runningProfiles.length === 0 ? (
            <Empty description="暂无运行窗口" />
          ) : (
            <div className="grid gap-3">
              {runningProfiles.map((profile) => (
                <article className="rounded-lg border bg-card p-4" key={profile.id}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox checked={selectedIds.includes(profile.id)} disabled={!profile.syncSupported} onChange={(event) => toggleProfile(profile.id, event.target.checked)} />
                      <Monitor className="size-5 text-primary" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-medium">{profile.name}</h4>
                          {effectiveMasterId === profile.id ? <Tag color="blue">主控</Tag> : null}
                          <Tag color={profile.syncSupported ? 'green' : 'orange'}>{profile.syncSupported ? 'Chromium CDP' : '不可同步'}</Tag>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{profile.debugUrl ?? '未暴露调试端口'}</p>
                      </div>
                    </div>
                    <Button disabled={!profile.syncSupported} htmlType="button" onClick={() => markMaster(profile.id)} size="small">
                      设为主控
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-base font-semibold">同步选项</h3>
            <div className="grid gap-3">
              {optionItems.map((item) => (
                <label className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm" key={item.key}>
                  <span>{item.label}</span>
                  <Switch checked={options[item.key]} onChange={(checked) => toggleOption(item.key, checked)} />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-base font-semibold">会话</h3>
            <div className="grid gap-2 text-sm">
              <InfoLine label="主控" value={getProfileName(profiles, effectiveMasterId)} />
              <InfoLine label="跟随" value={`${followerIds.length} 个`} />
              <InfoLine label="连接" value={`${session.connectedFollowers} / ${session.followerProfileIds.length}`} />
              <InfoLine label="最近事件" value={session.lastEvent?.summary ?? '无'} />
              <InfoLine label="错误" value={session.lastError ?? '无'} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function InfoLine({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[220px] break-words text-right font-medium">{value}</span>
    </div>
  );
}

function getProfileName(profiles: readonly WindowSyncProfile[], profileId: string): string {
  return profiles.find((profile) => profile.id === profileId)?.name ?? '未选择';
}
