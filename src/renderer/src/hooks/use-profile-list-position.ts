import { useEffect, useRef, useState } from 'react';

/**
 * 环境列表的浏览位置。
 *
 * 编辑是整页替换而非弹窗：进入编辑时 ProfileTable 整个卸载，保存或取消后重新挂载，
 * 滚动容器的 DOM 节点被销毁重建，scrollTop 归零。
 * 位置必须存在 App 这一层（它从不卸载）才能跨过这次卸载存活。
 */
interface ProfileListPosition {
  /** 刚编辑过、需要滚进可视区并短暂高亮的环境 id。 */
  readonly highlightId: string | undefined;
  /** 读取离开前的滚动偏移；做成取值函数而不是数值，避免在渲染阶段读 ref。 */
  readonly getScrollTop: () => number;
  readonly saveScrollTop: (scrollTop: number) => void;
  readonly markEdited: (profileId: string) => void;
}

/** 高亮持续时间：够用户看清改动落在哪一行，又不会一直留在界面上。 */
const HIGHLIGHT_DURATION_MS = 2000;

export function useProfileListPosition(): ProfileListPosition {
  // 用 ref 而不是 state：滚动事件高频触发，写 state 会让整个列表跟着重渲染
  const scrollTopRef = useRef(0);
  const [highlightId, setHighlightId] = useState<string>();

  useEffect(() => {
    if (!highlightId) {
      return;
    }

    const timer = window.setTimeout(() => setHighlightId(undefined), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  return {
    highlightId,
    getScrollTop: () => scrollTopRef.current,
    saveScrollTop: (scrollTop) => {
      scrollTopRef.current = scrollTop;
    },
    markEdited: (profileId) => setHighlightId(profileId)
  };
}
