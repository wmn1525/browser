import type { LaunchResult, ProfileSummary } from '../shared/types';
import type { WindowSyncProfile } from '../shared/window-sync-types';

/** 把 profile 摘要与运行态合成窗口同步页需要的视图模型。 */
export function toWindowSyncProfile(summary: ProfileSummary, launch: LaunchResult | undefined): WindowSyncProfile {
  const debugPort = launch?.debugPort ?? launch?.port;
  return {
    id: summary.id,
    name: summary.name,
    groupId: summary.groupId,
    isRunning: summary.isRunning,
    // 没有调试端口就连不上 CDP，同步脚本注入不进去
    syncSupported: summary.isRunning && Boolean(debugPort),
    debugPort,
    debugUrl: launch?.debugUrl,
    wsEndpoint: launch?.wsEndpoint
  };
}
