import { message as antdMessage } from 'antd';
import { useState } from 'react';

import type { ProfileSummary } from '../../../shared/types';
import { confirmWithAntd } from '../antd-confirm';
import { getErrorMessage } from '../app-helpers';
import { buildCopyNames, duplicateProfileTimes } from '../components/profiles/profile-duplicate';

interface ProfileDuplicateParams {
  readonly profiles: readonly ProfileSummary[];
  readonly refreshProfiles: () => Promise<void>;
  readonly setStatus: (status: string) => void;
}

interface ProfileDuplicateState {
  readonly close: () => void;
  readonly duplicateOnce: (profileId: string) => Promise<void>;
  readonly open: boolean;
  readonly request: (profileIds: readonly string[]) => void;
  readonly run: (count: number) => Promise<void>;
  readonly targetNames: readonly string[];
  readonly usedNames: readonly string[];
}

/** 复制多份的弹窗状态与执行编排，单个环境和批量选择共用。 */
export function useProfileDuplicate({
  profiles,
  refreshProfiles,
  setStatus
}: ProfileDuplicateParams): ProfileDuplicateState {
  const [targetIds, setTargetIds] = useState<readonly string[]>([]);
  const targets = profiles.filter((profile) => targetIds.includes(profile.id));

  async function run(count: number): Promise<void> {
    setTargetIds([]);
    const total = targets.length * count;
    // 批次内累积已用名字，否则同名环境的副本之间会互相撞号
    const used = new Set(profiles.map((profile) => profile.name));
    let finished = 0;
    try {
      for (const target of targets) {
        const names = buildCopyNames(target.name, count, [...used]);
        for (const name of names) {
          used.add(name);
        }

        await duplicateProfileTimes(target.id, names, () => {
          finished += 1;
          setStatus(`复制中 (${finished}/${total})`);
        });
      }

      await refreshProfiles();
      setStatus(`已复制 ${total} 个环境`);
    } catch (error) {
      // 中途失败时已创建的副本会保留，刷新让用户看到真实结果而不是停在进度文案
      await refreshProfiles();
      setStatus(`复制失败: ${getErrorMessage(error)}`);
      void antdMessage.error(`复制失败: ${getErrorMessage(error)}`);
    }
  }

  /** 行内复制 1 份：命名与批量复制统一走 -N，先确认再执行。 */
  async function duplicateOnce(profileId: string): Promise<void> {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    const name = buildCopyNames(profile.name, 1, profiles.map((item) => item.name)).at(0) ?? '';
    const confirmed = await confirmWithAntd({
      content: `将创建「${name}」。副本重新生成硬件指纹，UA、语言、时区和代理标签沿用原环境。`,
      okText: '确认复制',
      title: `确认复制「${profile.name}」？`
    });
    if (!confirmed) {
      setStatus('已取消复制');
      return;
    }

    setStatus(`正在复制: ${profile.name}`);
    try {
      await duplicateProfileTimes(profileId, [name], () => undefined);
      await refreshProfiles();
      setStatus(`已复制: ${name}`);
    } catch (error) {
      await refreshProfiles();
      setStatus(`复制失败: ${getErrorMessage(error)}`);
      void antdMessage.error(`复制失败: ${getErrorMessage(error)}`);
    }
  }

  return {
    close: () => setTargetIds([]),
    duplicateOnce,
    open: targets.length > 0,
    request: setTargetIds,
    run,
    targetNames: targets.map((profile) => profile.name),
    usedNames: profiles.map((profile) => profile.name)
  };
}
