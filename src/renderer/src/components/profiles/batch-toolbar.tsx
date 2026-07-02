import { Button } from 'antd';
import { Copy, FolderInput, Play, Power, Tags, Trash2 } from 'lucide-react';

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
        <Button htmlType="button" onClick={() => onAction('launch')} size="small" type="primary"><Play className="size-4" />批量启动</Button>
        <Button htmlType="button" onClick={() => onAction('close')} size="small"><Power className="size-4" />批量关闭</Button>
        <Button htmlType="button" onClick={() => onAction('duplicate')} size="small"><Copy className="size-4" />复制</Button>
        <Button htmlType="button" onClick={() => onAction('group')} size="small"><FolderInput className="size-4" />分组</Button>
        <Button htmlType="button" onClick={() => onAction('tag')} size="small"><Tags className="size-4" />标签</Button>
        <Button danger htmlType="button" onClick={() => onAction('delete')} size="small"><Trash2 className="size-4" />删除</Button>
      </div>
    </div>
  );
}
