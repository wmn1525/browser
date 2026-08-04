import { message as antdMessage } from 'antd';
import { useState } from 'react';

import type { ProfileSummary } from '../../../shared/types';
import { getErrorMessage } from '../app-helpers';
import { duplicateProfileTimes } from '../components/profiles/profile-duplicate';

interface ProfileDuplicateParams {
  readonly profiles: readonly ProfileSummary[];
  readonly refreshProfiles: () => Promise<void>;
  readonly setStatus: (status: string) => void;
}

interface ProfileDuplicateState {
  readonly close: () => void;
  readonly open: boolean;
  readonly request: (profileId: string) => void;
  readonly run: (names: readonly string[]) => Promise<void>;
  readonly targetName: string;
  readonly usedNames: readonly string[];
}

/** 单个环境复制多份的弹窗状态与执行编排。 */
export function useProfileDuplicate({
  profiles,
  refreshProfiles,
  setStatus
}: ProfileDuplicateParams): ProfileDuplicateState {
  const [targetId, setTargetId] = useState<string>();
  const target = profiles.find((profile) => profile.id === targetId);

  async function run(names: readonly string[]): Promise<void> {
    if (!targetId) {
      return;
    }

    setTargetId(undefined);
    try {
      await duplicateProfileTimes(targetId, names, (done) => setStatus(`复制中 (${done}/${names.length})`));
      await refreshProfiles();
      setStatus(`已复制 ${names.length} 份`);
    } catch (error) {
      // 中途失败时已创建的副本会保留，刷新让用户看到真实结果而不是停在进度文案
      await refreshProfiles();
      setStatus(`复制失败: ${getErrorMessage(error)}`);
      void antdMessage.error(`复制失败: ${getErrorMessage(error)}`);
    }
  }

  return {
    close: () => setTargetId(undefined),
    open: Boolean(target),
    request: setTargetId,
    run,
    targetName: target?.name ?? '',
    usedNames: profiles.map((profile) => profile.name)
  };
}
