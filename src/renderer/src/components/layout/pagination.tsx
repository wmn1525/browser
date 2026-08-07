import { Pagination as AntdPagination } from 'antd';

import { PROFILE_PAGE_SIZES } from '../../hooks/use-profile-pagination';

interface PaginationProps {
  /** 筛选后的总条数，不是当前页条数。 */
  readonly count: number;
  readonly onChange: (page: number, pageSize: number) => void;
  readonly page: number;
  readonly pageSize: number;
  readonly status: string;
}

/** 底部分页与状态栏，分页交互直接复用 antd Pagination（含每页条数与跳页）。 */
export function Pagination({ count, onChange, page, pageSize, status }: PaginationProps): JSX.Element {
  return (
    <section className="flex items-center justify-between gap-4 border-t bg-card px-6 py-2 text-xs text-secondary">
      <AntdPagination
        current={page}
        onChange={onChange}
        pageSize={pageSize}
        pageSizeOptions={[...PROFILE_PAGE_SIZES]}
        showQuickJumper
        showSizeChanger
        showTotal={(total, range) => `共 ${total} 条，当前 ${total === 0 ? 0 : range[0]}-${range[1]}`}
        size="small"
        total={count}
      />
      <span className="truncate">{status}</span>
    </section>
  );
}
