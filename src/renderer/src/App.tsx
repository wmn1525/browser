import { Modal, message as antdMessage } from 'antd';
import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProfileDetail, ProfileDraft, ProfileGroup, ProfileSummary } from '../../shared/types';
import { confirmDelete } from './antd-confirm';
import { FeatureDialog, type FeaturePanel, PreviewDialog } from './app-dialogs';
import {
  getAllTags,
  getErrorMessage,
  getTopbarDescription,
  getTopbarItems,
  getVisibleProfiles,
  normalizeGroupName
} from './app-helpers';
import { AppUpdateDialog } from './components/layout/app-update-dialog';
import { Pagination } from './components/layout/pagination';
import { Sidebar } from './components/layout/sidebar';
import { Topbar } from './components/layout/topbar';
import { WindowTitlebar } from './components/layout/window-titlebar';
import type { ModuleKey } from './components/feature/feature-page';
import { FeaturePage } from './components/feature/feature-page';
import { getFeaturePage } from './components/feature/feature-pages';
import { BatchGroupDialog, BatchTagDialog } from './components/profiles/batch-dialogs';
import { BatchToolbar } from './components/profiles/batch-toolbar';
import { Filterbar } from './components/profiles/filterbar';
import { ProfileFormPage } from './components/profiles/profile-form-page';
import { ProfileTable, type ProfileCommand } from './components/profiles/profile-table';
import { canDeleteGroup, createLocalGroup, getGroupLabel } from './components/profiles/profile-groups';
import { duplicateProfileWithNewFingerprint } from './components/profiles/profile-duplicate';
import { ProfileDuplicateDialog } from './components/profiles/profile-duplicate-dialog';
import { buildRenewProfileDraft } from './components/profiles/profile-renew-draft';
import { useAppUpdates } from './hooks/use-app-updates';
import { useBrowserKernels } from './hooks/use-browser-kernels';
import { useProfileBatch } from './hooks/use-profile-batch';
import { useProfileDuplicate } from './hooks/use-profile-duplicate';
import { useProfilePagination } from './hooks/use-profile-pagination';

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
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [status, setStatus] = useState('准备就绪');
  const [publicIp, setPublicIp] = useState('当前 IP: 获取中...');
  const [, setTimeTick] = useState(0);
  const [activeModule, setActiveModule] = useState<ModuleKey>('profiles');
  const kernelState = useBrowserKernels(setStatus);
  const appUpdates = useAppUpdates(setStatus);
  const tagOptions = getAllTags(profiles);
  // 移除模式只列所选环境真实带有的标签，避免出现移除一个没人有的标签
  const selectedTagOptions = getAllTags(profiles.filter((profile) => selectedIds.includes(profile.id)));
  const filteredProfiles = getVisibleProfiles(profiles, activeGroupId, keyword, selectedTags);
  const pagination = useProfilePagination(filteredProfiles, `${activeGroupId}|${keyword}|${selectedTags.join(',')}`);
  const batch = useProfileBatch({ deleteProfiles, groups, refreshProfiles, selectedIds, setStatus });
  const duplicate = useProfileDuplicate({ profiles, refreshProfiles, setStatus });
  // 只统计已选中的运行态环境，批量启动/关闭按钮据此禁用
  const runningSelectedCount = profiles.filter((profile) => selectedIds.includes(profile.id) && profile.isRunning).length;

  /** 只重新拉取列表，不改状态栏；主进程推送的刷新用它，避免覆盖批量操作的结果文案。 */
  async function reloadProfiles(): Promise<void> {
    const nextProfiles = await window.browserShell.listProfiles();
    setProfiles(nextProfiles);
    setSelectedIds((ids) => ids.filter((id) => nextProfiles.some((profile) => profile.id === id)));
  }

  async function refreshProfiles(): Promise<void> {
    setStatus('正在读取 profiles...');
    await reloadProfiles();
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
    void Promise.all([window.browserShell.listProfileGroups(), window.browserShell.listProfiles()]).then(([nextGroups, nextProfiles]) => {
      setGroups(nextGroups);
      setProfiles(nextProfiles);
      setSelectedIds((ids) => ids.filter((id) => nextProfiles.some((profile) => profile.id === id)));
      setStatus('准备就绪');
    });
    void refreshPublicIp();
    const timer = window.setInterval(() => setTimeTick((tick) => tick + 1), 60_000);
    const unsubscribe = window.browserShell.onProfilesChanged(() => {
      void reloadProfiles();
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
    if (command === 'duplicate') await runProfileTask(profileId, () => duplicateProfileWithNewFingerprint(profileId), '已复制');
    if (command === 'duplicate-many') duplicate.request(profileId);
    if (command === 'renew') await renewProfile(profileId);
    if (command === 'export') await exportProfile(profileId);
    if (command === 'edit') await openEditProfile(profileId);
    if (command === 'detail') await openDetail(profileId);
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

  async function renewProfile(profileId: string): Promise<void> {
    const detail = await window.browserShell.getProfile(profileId);
    Modal.confirm({
      cancelText: '取消',
      centered: true,
      content: '将随机生成新的指纹信息，并清理该环境的登录态、Cookie、缓存等浏览器用户数据。',
      okText: '确认换新',
      title: `确认一键换新「${detail.name}」？`,
      onCancel: () => setStatus('已取消一键换新'),
      onOk: () => runRenewProfile(detail)
    });
  }

  async function runRenewProfile(detail: ProfileDetail): Promise<void> {
    try {
      setStatus(`正在一键换新: ${detail.name}`);
      await window.browserShell.renewProfile(detail.id, buildRenewProfileDraft(detail));
      await refreshProfiles();
      setStatus(`已一键换新: ${detail.name}`);
      void antdMessage.success('已清理并换新');
    } catch (error) {
      setStatus(`一键换新失败: ${getErrorMessage(error)}`);
      void antdMessage.error(`清理失败: ${getErrorMessage(error)}`);
    }
  }

  async function deleteProfiles(profileIds: readonly string[]): Promise<void> {
    if (profileIds.length === 0) {
      setStatus('请先勾选要删除的环境');
      return;
    }

    if (!await confirmDelete(`确认删除 ${profileIds.length} 个环境？`, '删除后会移除本地环境配置和对应浏览器用户数据。')) {
      return;
    }

    // 逐个删除并收集失败项：某个环境的用户数据目录被占用时，不能让整批删除在第一条就中断
    const failures: { readonly profileId: string; readonly message: string }[] = [];
    for (const [index, profileId] of profileIds.entries()) {
      setStatus(`正在删除 (${index + 1}/${profileIds.length})`);
      try {
        await window.browserShell.deleteProfile(profileId);
      } catch (error) {
        failures.push({ profileId, message: getErrorMessage(error) });
      }
    }

    // 失败项保留勾选，便于用户手动关闭浏览器后直接重试
    setSelectedIds(failures.map((failure) => failure.profileId));
    await refreshProfiles();
    if (failures.length > 0) {
      const summary = `已删除 ${profileIds.length - failures.length}/${profileIds.length} 个环境，失败 ${failures.length} 个: ${failures[0]!.message}`;
      setStatus(summary);
      void antdMessage.error(summary);
      return;
    }

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
    if (!await confirmDelete(`确认删除空分组「${current.name}」？`, '该分组为空，删除后不会影响已有环境。')) {
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

  function openFeaturePanel(title: string, description: string, items: readonly string[]): void {
    setFeaturePanel({ title, description, items });
    setStatus(title);
  }

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
                tagOptions={tagOptions}
              />
            ) : activeModule === 'profiles' ? (
              <>
                <Filterbar
                  activeGroupId={activeGroupId}
                  groups={groups}
                  keyword={keyword}
                  onGroupChange={setActiveGroupId}
                  onKeywordChange={setKeyword}
                  onRefresh={() => void refreshProfiles()}
                  onTagsChange={setSelectedTags}
                  selectedTags={selectedTags}
                  tagOptions={tagOptions}
                />
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                  <BatchToolbar
                    onAction={(action) => void batch.runAction(action)}
                    onClearSelection={() => setSelectedIds([])}
                    onSelectAll={() => setSelectedIds(filteredProfiles.map((profile) => profile.id))}
                    runningCount={runningSelectedCount}
                    selectedCount={selectedIds.length}
                    totalCount={filteredProfiles.length}
                  />
                  <ProfileTable
                    groups={groups}
                    onCommand={(command, profileId) => void handleProfileCommand(command, profileId)}
                    onSelectedIdsChange={setSelectedIds}
                    profiles={pagination.pagedProfiles}
                    selectedIds={selectedIds}
                  />
                </section>
                <Pagination count={filteredProfiles.length} onChange={pagination.change} page={pagination.page} pageSize={pagination.pageSize} status={status} />
              </>
            ) : (
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
            )}
            <footer className="flex items-center justify-between border-t bg-card px-6 py-3 text-xs text-secondary">
              <div className="flex items-center gap-2"><MapPin className="size-4" /><span>{publicIp}</span></div>
              <span>© 2026 Im-Run Browser</span>
            </footer>
          </main>
        </div>
        <BatchTagDialog onCancel={batch.closeDialog} onSubmit={(tags, mode) => void batch.applyTags(tags, mode)} open={batch.dialog === 'tag'} selectedTagOptions={selectedTagOptions} tagOptions={tagOptions} />
        <BatchGroupDialog groups={groups} onCancel={batch.closeDialog} onSubmit={(groupId) => void batch.applyGroup(groupId)} open={batch.dialog === 'group'} />
        <ProfileDuplicateDialog onCancel={duplicate.close} onSubmit={(names) => void duplicate.run(names)} open={duplicate.open} profileName={duplicate.targetName} usedNames={duplicate.usedNames} />
        <PreviewDialog onOpenChange={() => setPreviewText('')} text={previewText} title={previewTitle} />
        <FeatureDialog onClose={() => setFeaturePanel(undefined)} panel={featurePanel} />
        <AppUpdateDialog event={appUpdates.event} onDownload={() => void appUpdates.downloadUpdate()} onInstall={() => void appUpdates.installUpdate()} onOpenChange={appUpdates.setOpen} onSkip={appUpdates.skipVersion} open={appUpdates.open} />
    </div>
  );
}
