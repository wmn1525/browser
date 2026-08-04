import { message as antdMessage } from 'antd';
import { useState } from 'react';

import type { ProfileGroup } from '../../../shared/types';
import { getErrorMessage, toProfileDraft } from '../app-helpers';
import { getGroupLabel } from '../components/profiles/profile-groups';

/** 批量操作类型，与批量工具栏按钮一一对应。 */
export type BatchAction = 'launch' | 'close' | 'delete' | 'tag' | 'group' | 'duplicate';

/** 需要先弹窗采集输入的批量操作。 */
export type BatchDialogKind = 'tag' | 'group';

interface ProfileBatchParams {
  readonly deleteProfiles: (profileIds: readonly string[]) => Promise<void>;
  readonly groups: readonly ProfileGroup[];
  readonly refreshProfiles: () => Promise<void>;
  readonly selectedIds: readonly string[];
  readonly setStatus: (status: string) => void;
}

interface ProfileBatchState {
  readonly dialog: BatchDialogKind | undefined;
  readonly closeDialog: () => void;
  readonly runAction: (action: BatchAction) => Promise<void>;
  readonly applyTags: (tags: readonly string[]) => Promise<void>;
  readonly applyGroup: (groupId: string | undefined) => Promise<void>;
}

/** 批量操作编排：串行执行、逐条上报进度，单条失败不中断其余环境但会汇总暴露。 */
export function useProfileBatch({
  deleteProfiles,
  groups,
  refreshProfiles,
  selectedIds,
  setStatus
}: ProfileBatchParams): ProfileBatchState {
  const [dialog, setDialog] = useState<BatchDialogKind>();

  async function runSerial(task: (profileId: string) => Promise<unknown>, label: string): Promise<void> {
    const failures: string[] = [];
    for (const [index, profileId] of selectedIds.entries()) {
      setStatus(`${label}中 (${index + 1}/${selectedIds.length})`);
      try {
        await task(profileId);
      } catch (error) {
        failures.push(`${profileId}: ${getErrorMessage(error)}`);
      }
    }

    await refreshProfiles();
    if (failures.length > 0) {
      setStatus(`${label}完成 ${selectedIds.length - failures.length}/${selectedIds.length}，失败 ${failures.length} 个: ${failures[0]}`);
      void antdMessage.error(`${label}失败 ${failures.length} 个: ${failures[0]}`);
      return;
    }

    setStatus(`${label}完成: ${selectedIds.length} 个环境`);
  }

  async function runAction(action: BatchAction): Promise<void> {
    if (selectedIds.length === 0) {
      setStatus('请先勾选环境');
      return;
    }

    if (action === 'tag' || action === 'group') {
      setDialog(action);
      return;
    }
    if (action === 'delete') {
      // deleteProfiles 内部已完成确认、失败汇总与列表刷新
      await deleteProfiles(selectedIds);
      return;
    }
    if (action === 'launch') await runSerial((id) => window.browserShell.launchProfile(id), '批量启动');
    if (action === 'close') await runSerial((id) => window.browserShell.closeProfile(id), '批量关闭');
    if (action === 'duplicate') await runSerial((id) => window.browserShell.duplicateProfile(id), '批量复制');
  }

  async function applyTags(tags: readonly string[]): Promise<void> {
    setDialog(undefined);
    await runSerial(async (profileId) => {
      const detail = await window.browserShell.getProfile(profileId);
      await window.browserShell.updateProfile(profileId, toProfileDraft(detail, {
        tags: Array.from(new Set([...detail.tags, ...tags]))
      }));
    }, '批量添加标签');
  }

  async function applyGroup(groupId: string | undefined): Promise<void> {
    setDialog(undefined);
    await runSerial(async (profileId) => {
      const detail = await window.browserShell.getProfile(profileId);
      await window.browserShell.updateProfile(profileId, toProfileDraft(detail, { groupId }));
    }, `批量移动到「${getGroupLabel(groups, groupId)}」`);
  }

  return {
    dialog,
    closeDialog: () => setDialog(undefined),
    runAction,
    applyTags,
    applyGroup
  };
}
