import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProfileDetail, ProfileDraft, ProfileGroup, ProfileSummary } from '../../shared/types';
import { FeatureDialog, type FeaturePanel, PreviewDialog } from './app-dialogs';
import {
  getBatchGroupPrompt,
  getErrorMessage,
  getFilterItems,
  getTopbarDescription,
  getTopbarItems,
  getVisibleProfiles,
  normalizeGroupName,
  resolvePromptGroupId,
  toProfileDraft
} from './app-helpers';
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
import { canDeleteGroup, createLocalGroup, getGroupLabel } from './components/profiles/profile-groups';
import { useAppUpdates } from './hooks/use-app-updates';
import { useBrowserKernels } from './hooks/use-browser-kernels';

/** React renderer 根组件，管理 Electron preload 暴露的数据流。 */
export function App(): JSX.Element {
  const [profiles, setProfiles] = useState<readonly ProfileSummary[]>([]);
  const [groups, setGroups] = useState<readonly ProfileGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [formMode, setFormMode] = useState<'create' | 'edit' | undefined>();
  const [editingProfile, setEditingProfile] = useState<ProfileDetail>();
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [featurePanel, setFeaturePanel] = useState<FeaturePanel>();
  const [keyword, setKeyword] = useState('');
  const [tagKeyword, setTagKeyword] = useState('');
  const [activeGroupId, setActiveGroupId] = useState('all');
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

  async function refreshGroups(): Promise<void> {
    setGroups(await window.browserShell.listProfileGroups());
  }

  useEffect(() => {
    void refreshProfiles();
    void refreshGroups();
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

  async function saveGroups(nextGroups: readonly ProfileGroup[], done: string): Promise<void> {
    await window.browserShell.saveProfileGroups(nextGroups);
    setGroups(nextGroups);
    setStatus(done);
  }

  async function createGroup(groupName: string): Promise<void> {
    const name = normalizeGroupName(groupName);
    if (!name) {
      setStatus('已取消新建分组');
      return;
    }
    if (groups.some((group) => group.name === name)) {
      setStatus(`分组已存在: ${name}`);
      return;
    }

    await saveGroups([...groups, createLocalGroup(name)], `已新建分组: ${name}`);
  }

  async function renameGroup(groupId: string, groupName: string): Promise<void> {
    const current = groups.find((group) => group.id === groupId);
    if (!current) {
      setStatus(`分组不存在: ${groupId}`);
      return;
    }

    const name = normalizeGroupName(groupName);
    if (!name || name === current.name) {
      setStatus('已取消重命名分组');
      return;
    }
    if (groups.some((group) => group.id !== groupId && group.name === name)) {
      setStatus(`分组已存在: ${name}`);
      return;
    }

    await saveGroups(groups.map((group) => group.id === groupId ? { ...group, name } : group), `已重命名分组: ${name}`);
  }

  async function deleteGroup(groupId: string): Promise<void> {
    const current = groups.find((group) => group.id === groupId);
    if (!current) {
      setStatus(`分组不存在: ${groupId}`);
      return;
    }
    if (!canDeleteGroup(groupId, profiles)) {
      setStatus(`分组 ${current.name} 下仍有环境，不能删除`);
      return;
    }
    if (!window.confirm(`确认删除空分组「${current.name}」？`)) {
      return;
    }

    const nextGroups = groups.filter((group) => group.id !== groupId);
    if (activeGroupId === groupId) {
      setActiveGroupId('all');
    }
    await saveGroups(nextGroups, `已删除分组: ${current.name}`);
  }

  function openGroupProfiles(groupId: string): void {
    setActiveGroupId(groupId);
    setActiveModule('profiles');
    setStatus(`已筛选分组: ${groupId === 'ungrouped' ? '未分组' : getGroupLabel(groups, groupId)}`);
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
    if (action === 'group') await applyBatchGroup();
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
      await window.browserShell.updateProfile(profileId, toProfileDraft(detail, {
        tags: Array.from(new Set([...detail.tags, ...tags]))
      }));
    }
    setStatus(`已为 ${selectedIds.length} 个环境添加标签`);
  }

  async function applyBatchGroup(): Promise<void> {
    const target = resolvePromptGroupId(window.prompt(getBatchGroupPrompt(groups)), groups);
    if (target.cancelled) {
      setStatus('已取消批量分组');
      return;
    }

    for (const profileId of selectedIds) {
      const detail = await window.browserShell.getProfile(profileId);
      await window.browserShell.updateProfile(profileId, toProfileDraft(detail, { groupId: target.groupId }));
    }
    setStatus(`已移动 ${selectedIds.length} 个环境到 ${getGroupLabel(groups, target.groupId)}`);
  }

  function openFeaturePanel(title: string, description: string, items: readonly string[]): void {
    setFeaturePanel({ title, description, items });
    setStatus(title);
  }

  const filteredProfiles = getVisibleProfiles(profiles, activeGroupId, keyword, tagKeyword);
  const activeFeaturePage = activeModule === 'profiles' ? undefined : getFeaturePage(activeModule);
  const pageTitle = formMode ? (formMode === 'edit' ? '编辑浏览器' : '新建浏览器') : (activeFeaturePage?.title ?? '环境管理');

  return (
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
                groups={groups}
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
                  activeGroupId={activeGroupId}
                  groups={groups}
                  keyword={keyword}
                  onAction={(message) => openFeaturePanel(message, '筛选与表格工具入口。', getFilterItems(message))}
                  onClear={() => {
                    setActiveGroupId('all');
                    setKeyword('');
                    setTagKeyword('');
                    setStatus('已清空筛选');
                  }}
                  onDeleteSelected={() => void deleteProfiles(selectedIds)}
                  onGroupChange={setActiveGroupId}
                  onKeywordChange={setKeyword}
                  onRefresh={() => void refreshProfiles()}
                  onTagKeywordChange={setTagKeyword}
                  tagKeyword={tagKeyword}
                />
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                  <BatchToolbar onAction={(action) => void handleBatchAction(action)} selectedCount={selectedIds.length} />
                  <ProfileTable
                    groups={groups}
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
                  groups={groups}
                  onAction={(message) => openFeaturePanel(message, '该入口已按指纹浏览器操作文档做页面闭环。', [
                    '当前为本地管理壳原型，不会执行云端或团队破坏性操作',
                    '下一步可接入真实数据模型与核心引擎 API',
                    '所有按钮都会给出明确反馈'
                  ])}
                  onCreateGroup={(name) => void createGroup(name)}
                  onDeleteGroup={(groupId) => void deleteGroup(groupId)}
                  onOpenGroup={openGroupProfiles}
                  onRenameGroup={(groupId, name) => void renameGroup(groupId, name)}
                  profiles={profiles}
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
  );
}
