import { Button } from 'antd';
import { Copy, FolderInput, ListChecks, Play, Power, Tags, Trash2, X } from 'lucide-react';

import type { BatchAction } from '../../hooks/use-profile-batch';

interface BatchToolbarProps {
  readonly onAction: (action: BatchAction) => void;
  readonly onClearSelection: () => void;
  readonly onSelectAll: () => void;
  /** 已选环境中处于运行状态的数量，用于禁用无意义的启动/关闭。 */
  readonly runningCount: number;
  readonly selectedCount: number;
  /** 当前筛选条件下的总条数，跨页全选以它为准。 */
  readonly totalCount: number;
}

/** 批量操作条，仅在勾选 profile 后出现；选择状态跨页保留，由外层维护。 */
export function BatchToolbar({
  onAction,
  onClearSelection,
  onSelectAll,
  runningCount,
  selectedCount,
  totalCount
}: BatchToolbarProps): JSX.Element | null {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">已选择 {selectedCount} / {totalCount} 个环境</span>
        <span className="text-xs text-muted-foreground">运行中 {runningCount} 个</span>
        {selectedCount < totalCount ? (
          <Button htmlType="button" onClick={onSelectAll} size="small" type="link">
            <ListChecks className="size-4" />选择全部 {totalCount} 个
          </Button>
        ) : null}
        <Button htmlType="button" onClick={onClearSelection} size="small" type="link">
          <X className="size-4" />清空选择
        </Button>
      </div>
      <div className="flex gap-2">
        <Button disabled={runningCount === selectedCount} htmlType="button" onClick={() => onAction('launch')} size="small" type="primary"><Play className="size-4" />批量启动</Button>
        <Button disabled={runningCount === 0} htmlType="button" onClick={() => onAction('close')} size="small"><Power className="size-4" />批量关闭</Button>
        <Button htmlType="button" onClick={() => onAction('duplicate')} size="small"><Copy className="size-4" />复制</Button>
        <Button htmlType="button" onClick={() => onAction('group')} size="small"><FolderInput className="size-4" />分组</Button>
        <Button htmlType="button" onClick={() => onAction('tag')} size="small"><Tags className="size-4" />标签</Button>
        <Button danger htmlType="button" onClick={() => onAction('delete')} size="small"><Trash2 className="size-4" />删除</Button>
      </div>
    </div>
  );
}
