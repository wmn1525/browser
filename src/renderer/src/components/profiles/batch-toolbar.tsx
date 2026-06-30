import { Copy, FolderInput, Play, Power, Tags, Trash2 } from 'lucide-react';

import { Button } from '../ui/button';

interface BatchToolbarProps {
  readonly selectedCount: number;
  readonly onAction: (action: 'launch' | 'close' | 'delete' | 'tag' | 'group' | 'duplicate') => void;
}

/** 批量操作条，仅在勾选 profile 后出现。 */
export function BatchToolbar({ onAction, selectedCount }: BatchToolbarProps): JSX.Element | null {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
      <span className="font-medium">已选择 {selectedCount} 个环境</span>
      <div className="flex gap-2">
        <Button onClick={() => onAction('launch')} size="sm" type="button"><Play className="size-4" />批量启动</Button>
        <Button onClick={() => onAction('close')} size="sm" type="button" variant="secondary"><Power className="size-4" />批量关闭</Button>
        <Button onClick={() => onAction('duplicate')} size="sm" type="button" variant="outline"><Copy className="size-4" />复制</Button>
        <Button onClick={() => onAction('group')} size="sm" type="button" variant="outline"><FolderInput className="size-4" />分组</Button>
        <Button onClick={() => onAction('tag')} size="sm" type="button" variant="outline"><Tags className="size-4" />标签</Button>
        <Button onClick={() => onAction('delete')} size="sm" type="button" variant="destructive"><Trash2 className="size-4" />删除</Button>
      </div>
    </div>
  );
}
