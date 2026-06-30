import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProfileDetail, ProfileDraft, ProfileSummary } from '../../shared/types';
import { AppUpdateDialog } from './components/layout/app-update-dialog';
import { Pagination } from './components/layout/pagination';
import { Sidebar } from './components/layout/sidebar';
import { Topbar } from './components/layout/topbar';
import { WindowTitlebar } from './components/layout/window-titlebar';
import type { ModuleKey } from './components/feature/feature-page';
import { FeaturePage } from './components/feature/feature-page';
import { getFeaturePage } from './components/feature/feature-pages';
import { BatchToolbar } from './components/profiles/batch-toolbar';
import { Filterbar } from './components/profiles/filterbar';
import { ProfileFormPage } from './components/profiles/profile-form-page';
import { ProfileTable, type ProfileCommand } from './components/profiles/profile-table';
import { Button } from './components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './components/ui/dialog';
import { Textarea } from './components/ui/textarea';
import { ToastProvider } from './components/ui/toast';
import { TooltipProvider } from './components/ui/tooltip';
import { useAppUpdates } from './hooks/use-app-updates';
import { useBrowserKernels } from './hooks/use-browser-kernels';

interface FeaturePanel {
  readonly title: string;
  readonly description: string;
  readonly items: readonly string[];
}

/** React renderer 根组件，管理 Electron preload 暴露的数据流。 */
export function App(): JSX.Element {
  const [profiles, setProfiles] = useState<readonly ProfileSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [formMode, setFormMode] = useState<'create' | 'edit' | undefined>();
  const [editingProfile, setEditingProfile] = useState<ProfileDetail>();
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [featurePanel, setFeaturePanel] = useState<FeaturePanel>();
  const [keyword, setKeyword] = useState('');
  const [tagKeyword, setTagKeyword] = useState('');
  const [status, setStatus] = useState('准备就绪');
  const [publicIp, setPublicIp] = useState('当前 IP: 获取中...');
  const [, setTimeTick] = useState(0);
  const [activeModule, setActiveModule] = useState<ModuleKey>('profiles');
  const kernelState = useBrowserKernels(setStatus);
  const appUpdates = useAppUpdates(setStatus);

  async function refreshProfiles(): Promise<void> {
    setStatus('正在读取 profiles...');
    const nextProfiles = await window.browserShell.listProfiles();
    setProfiles(nextProfiles);
    setSelectedIds((ids) => ids.filter((id) => nextProfiles.some((profile) => profile.id === id)));
    setStatus('准备就绪');
  }

  async function refreshPublicIp(): Promise<void> {
    setPublicIp('当前 IP: 获取中...');
    try {
      const info = await window.browserShell.getPublicIp();
      setPublicIp(`当前 IP: ${info.ip} (${info.regionLabel})`);
    } catch (error) {
      setPublicIp(`当前 IP: 获取失败 (${getErrorMessage(error)})`);
    }
  }

  useEffect(() => {
    void refreshProfiles();
    void refreshPublicIp();
    const timer = window.setInterval(() => setTimeTick((tick) => tick + 1), 60_000);
    const unsubscribe = window.browserShell.onProfilesChanged(() => {
      void refreshProfiles();
    });
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);

  async function submitProfile(draft: ProfileDraft): Promise<void> {
    setStatus(editingProfile ? '正在保存 profile...' : '正在创建 profile...');
    if (editingProfile) {
      await window.browserShell.updateProfile(editingProfile.id, draft);
    } else {
      await window.browserShell.createProfile(draft);
    }

    setFormMode(undefined);
    setEditingProfile(undefined);
    setActiveModule('profiles');
    await refreshProfiles();
  }

  async function handleProfileCommand(command: ProfileCommand, profileId: string): Promise<void> {
    if (command === 'launch') await runProfileTask(profileId, () => window.browserShell.launchProfile(profileId), '已启动');
    if (command === 'close') await runProfileTask(profileId, () => window.browserShell.closeProfile(profileId), '已关闭');
    if (command === 'delete') await deleteProfiles([profileId]);
    if (command === 'duplicate') await runProfileTask(profileId, () => window.browserShell.duplicateProfile(profileId), '已复制');
    if (command === 'export') await exportProfile(profileId);
    if (command === 'edit') await openEditProfile(profileId);
    if (command === 'detail') await openDetail(profileId);
    if (command === 'proxy') await openEditProfile(profileId);
    if (command === 'account') openFeaturePanel('账号绑定', `环境 ${profileId} 的账号信息管理入口。`, [
      '记录平台账号、登录邮箱、手机号和备注',
      '后续可与 Cookie 导入、启动页和自动化脚本联动',
      '当前版本先保留本地 profile 配置，不上传账号数据'
    ]);
    await refreshProfiles();
  }

  async function runProfileTask(profileId: string, task: () => Promise<unknown>, done: string): Promise<void> {
    setStatus(`${done}: ${profileId}`);
    await task();
  }

  async function openEditProfile(profileId: string): Promise<void> {
    setEditingProfile(await window.browserShell.getProfile(profileId));
    setFormMode('edit');
    setActiveModule('profiles');
  }

  async function openDetail(profileId: string): Promise<void> {
    const detail = await window.browserShell.getProfile(profileId);
    setPreviewTitle(`Profile 详情: ${detail.name}`);
    setPreviewText(JSON.stringify(detail, null, 2));
  }

  async function exportProfile(profileId: string): Promise<void> {
    const exported = await window.browserShell.exportProfile(profileId);
    setPreviewTitle(`导出 JSON: ${profileId}`);
    setPreviewText(exported);
    await navigator.clipboard?.writeText(exported);
    setStatus(`已导出并复制到剪贴板: ${profileId}`);
  }

  async function deleteProfiles(profileIds: readonly string[]): Promise<void> {
    if (profileIds.length === 0) {
      setStatus('请先勾选要删除的环境');
      return;
    }

    if (!window.confirm(`确认删除 ${profileIds.length} 个环境？`)) {
      return;
    }

    for (const profileId of profileIds) {
      await window.browserShell.deleteProfile(profileId);
    }
    setSelectedIds([]);
    setStatus(`已删除 ${profileIds.length} 个环境`);
  }

  async function handleBatchAction(action: 'launch' | 'close' | 'delete' | 'tag' | 'group' | 'duplicate'): Promise<void> {
    if (selectedIds.length === 0) {
      setStatus('请先勾选环境');
      return;
    }

    if (action === 'delete') await deleteProfiles(selectedIds);
    if (action === 'launch') await runBatch((id) => window.browserShell.launchProfile(id), '批量启动完成');
    if (action === 'close') await runBatch((id) => window.browserShell.closeProfile(id), '批量关闭完成');
    if (action === 'duplicate') await runBatch((id) => window.browserShell.duplicateProfile(id), '批量复制完成');
    if (action === 'tag') await applyBatchTags();
    if (action === 'group') openFeaturePanel('批量分组', '分组管理闭环入口。', [
      `当前已选择 ${selectedIds.length} 个环境`,
      '可在下一步接入 createGroup / moveToGroup 做真实分组',
      '当前 profile 数据仍保持未分组，不做隐式迁移'
    ]);
    await refreshProfiles();
  }

  async function runBatch(task: (profileId: string) => Promise<unknown>, done: string): Promise<void> {
    for (const profileId of selectedIds) {
      await task(profileId);
    }
    setStatus(`${done}: ${selectedIds.length} 个环境`);
  }

  async function applyBatchTags(): Promise<void> {
    const value = window.prompt('请输入批量标签，多个标签用逗号分隔');
    const tags = value?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
    if (tags.length === 0) {
      setStatus('已取消批量标签');
      return;
    }

    for (const profileId of selectedIds) {
      const detail = await window.browserShell.getProfile(profileId);
      await window.browserShell.updateProfile(profileId, {
        id: undefined,
        name: detail.name,
        accountName: detail.accountName,
        accountPlatform: detail.accountPlatform,
        browserKernel: detail.browserKernel,
        cookiesText: detail.cookiesText,
        groupId: detail.groupId,
        loadImages: detail.loadImages,
        loadVideos: detail.loadVideos,
        os: detail.os,
        osVersion: detail.osVersion,
        proxy: detail.proxy,
        searchEngine: detail.searchEngine,
        timezone: detail.timezone,
        userAgent: detail.userAgent,
        fingerprint: detail.fingerprint,
        startUrls: detail.startUrls,
        tags: Array.from(new Set([...detail.tags, ...tags]))
      });
    }
    setStatus(`已为 ${selectedIds.length} 个环境添加标签`);
  }

  function openFeaturePanel(title: string, description: string, items: readonly string[]): void {
    setFeaturePanel({ title, description, items });
    setStatus(title);
  }

  const filteredProfiles = filterProfiles(profiles, keyword, tagKeyword);
  const activeFeaturePage = activeModule === 'profiles' ? undefined : getFeaturePage(activeModule);
  const pageTitle = formMode ? (formMode === 'edit' ? '编辑浏览器' : '新建浏览器') : (activeFeaturePage?.title ?? '环境管理');

  return (
    <TooltipProvider>
      <ToastProvider>
        <div className="h-screen overflow-hidden bg-background text-foreground">
        <WindowTitlebar />
        <div className="flex h-[calc(100vh-34px)] overflow-hidden">
          <Sidebar activeModule={activeModule} onCreateProfile={() => {
            setEditingProfile(undefined);
            setFormMode('create');
            setActiveModule('profiles');
          }} onNavigate={(module) => {
            setFormMode(undefined);
            setEditingProfile(undefined);
            setActiveModule(module);
            setStatus(module === 'profiles' ? '环境管理' : '已打开详细模块页');
          }} />
          <main className="flex min-w-0 flex-1 flex-col">
            <Topbar downloadingKernelId={kernelState.downloadingKernelId} kernelProgress={kernelState.kernelProgress} kernels={kernelState.kernels} kernelStatus={kernelState.kernelStatus} onAction={(message) => openFeaturePanel(message, getTopbarDescription(message), getTopbarItems(message))} onCheckUpdates={() => void appUpdates.checkForUpdates()} onDownloadKernel={(kernelId) => void kernelState.downloadKernel(kernelId)} onRefresh={() => {
              void refreshProfiles();
              void refreshPublicIp();
            }} title={pageTitle} />
            {formMode ? (
              <ProfileFormPage
                initialProfile={editingProfile}
                onCancel={() => {
                  setFormMode(undefined);
                  setEditingProfile(undefined);
                  setStatus('已取消编辑');
                }}
                onSubmit={submitProfile}
              />
            ) : activeModule === 'profiles' ? (
              <>
                <Filterbar
                  keyword={keyword}
                  onAction={(message) => openFeaturePanel(message, '筛选与表格工具入口。', getFilterItems(message))}
                  onClear={() => {
                    setKeyword('');
                    setTagKeyword('');
                    setStatus('已清空筛选');
                  }}
                  onDeleteSelected={() => void deleteProfiles(selectedIds)}
                  onKeywordChange={setKeyword}
                  onRefresh={() => void refreshProfiles()}
                  onTagKeywordChange={setTagKeyword}
                  tagKeyword={tagKeyword}
                />
                <section className="flex-1 overflow-auto p-6">
                  <BatchToolbar onAction={(action) => void handleBatchAction(action)} selectedCount={selectedIds.length} />
                  <ProfileTable
                    onCommand={(command, profileId) => void handleProfileCommand(command, profileId)}
                    onSelectedIdsChange={setSelectedIds}
                    profiles={filteredProfiles}
                    selectedIds={selectedIds}
                  />
                </section>
                <Pagination count={filteredProfiles.length} status={status} />
              </>
            ) : (
              <>
                <FeaturePage
                  config={activeFeaturePage ?? getFeaturePage('groups')!}
                  onAction={(message) => openFeaturePanel(message, '该入口已按指纹浏览器操作文档做页面闭环。', [
                    '当前为本地管理壳原型，不会执行云端或团队破坏性操作',
                    '下一步可接入真实数据模型与核心引擎 API',
                    '所有按钮都会给出明确反馈'
                  ])}
                />
                <Pagination count={0} status={status} />
              </>
            )}
            <footer className="flex items-center justify-between border-t bg-card px-6 py-3 text-xs text-secondary">
              <div className="flex items-center gap-2"><MapPin className="size-4" /><span>{publicIp}</span></div>
              <span>© 2026 Im-Run Browser</span>
            </footer>
          </main>
        </div>
        <PreviewDialog onOpenChange={() => setPreviewText('')} text={previewText} title={previewTitle} />
        <FeatureDialog onClose={() => setFeaturePanel(undefined)} panel={featurePanel} />
        <AppUpdateDialog event={appUpdates.event} onDownload={() => void appUpdates.downloadUpdate()} onInstall={() => void appUpdates.installUpdate()} onOpenChange={appUpdates.setOpen} onSkip={appUpdates.skipVersion} open={appUpdates.open} />
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}

function FeatureDialog({ onClose, panel }: {
  readonly onClose: () => void;
  readonly panel: FeaturePanel | undefined;
}): JSX.Element {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(panel)}>
      <DialogContent>
        <DialogTitle>{panel?.title}</DialogTitle>
        <DialogDescription>{panel?.description}</DialogDescription>
        <div className="mt-4 rounded-lg border bg-muted/40 p-4">
          <ul className="grid gap-2 text-sm">
            {(panel?.items ?? []).map((item) => <li className="rounded-md bg-card px-3 py-2" key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="mt-4 flex justify-end"><DialogClose asChild><Button type="button">完成</Button></DialogClose></div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ onOpenChange, text, title }: {
  readonly onOpenChange: () => void;
  readonly text: string;
  readonly title: string;
}): JSX.Element {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onOpenChange(); }} open={text.length > 0}>
      <DialogContent className="w-[min(760px,calc(100vw-48px))]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>内容已生成，可检查后复制或保存。</DialogDescription>
        <Textarea className="mt-4 min-h-80 font-mono text-xs" readOnly value={text} />
        <div className="mt-4 flex justify-end"><DialogClose asChild><Button type="button">关闭</Button></DialogClose></div>
      </DialogContent>
    </Dialog>
  );
}

function filterProfiles(
  profiles: readonly ProfileSummary[],
  keyword: string,
  tagKeyword: string
): readonly ProfileSummary[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedTag = tagKeyword.trim().toLowerCase();
  return profiles.filter((profile) => {
    const textMatch =
      normalizedKeyword.length === 0 ||
      profile.id.toLowerCase().includes(normalizedKeyword) ||
      profile.name.toLowerCase().includes(normalizedKeyword) ||
      profile.proxyLabel.toLowerCase().includes(normalizedKeyword);
    const tagMatch =
      normalizedTag.length === 0 ||
      profile.tags.some((tag) => tag.toLowerCase().includes(normalizedTag));
    return textMatch && tagMatch;
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getTopbarDescription(message: string): string {
  if (message.includes('同步')) return '同步入口已闭环为本地任务确认，后续可接入云同步。';
  return '顶部工具入口已闭环到可确认的操作面板。';
}

function getTopbarItems(message: string): readonly string[] {
  if (message.includes('消息')) return ['系统消息', '任务失败提醒', '版本更新通知'];
  if (message.includes('同步')) return ['刷新本地 profile', '检查运行状态', '同步公网 IP 信息'];
  if (message.includes('通知')) return ['浏览器关闭提醒', '代理检测结果', '批量任务结果'];
  if (message.includes('账号')) return ['修改昵称', '团队权限', '操作日志'];
  return ['入口已响应', '当前不执行破坏性操作', '可继续接入后端能力'];
}

function getFilterItems(message: string): readonly string[] {
  if (message.includes('列设置')) return ['编号列', '代理列', '标签列', '备注列', '操作列'];
  if (message.includes('收藏')) return ['收藏视图已响应', '后续可持久化收藏筛选', '不会修改 profile 数据'];
  return ['请先勾选环境', '可使用批量工具条执行删除', '删除会弹出确认框'];
}
