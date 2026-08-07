import { useEffect, useState } from 'react';

import type { ProfileSummary } from '../../../shared/types';

/** 每页条数候选，底部分页栏下拉直接复用该常量。 */
export const PROFILE_PAGE_SIZES: readonly number[] = [10, 20, 50, 100];

interface ProfilePaginationState {
  /** 已收敛到有效范围的当前页码，从 1 开始。 */
  readonly page: number;
  readonly pageSize: number;
  /** 当前页要渲染的 profile 切片。 */
  readonly pagedProfiles: readonly ProfileSummary[];
  readonly change: (page: number, pageSize: number) => void;
}

/**
 * profile 列表分页状态。
 * resetKey 表示筛选条件签名（分组 + 关键字 + 标签），变化时回到第 1 页，
 * 避免筛选后仍停留在结果不足的页码上看到空表格。
 */
export function useProfilePagination(
  profiles: readonly ProfileSummary[],
  resetKey: string
): ProfilePaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PROFILE_PAGE_SIZES[0]!);

  const maxPage = Math.max(1, Math.ceil(profiles.length / pageSize));
  // 渲染阶段先收敛页码，保证本次切片一定落在有效范围内
  const safePage = Math.min(page, maxPage);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // 删除或换页长后总页数变少时同步回写状态，避免列表恢复时跳回旧页码
  useEffect(() => {
    setPage((current) => Math.min(current, maxPage));
  }, [maxPage]);

  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    pagedProfiles: profiles.slice(start, start + pageSize),
    change: (nextPage, nextPageSize) => {
      setPage(nextPage);
      setPageSize(nextPageSize);
    }
  };
}
