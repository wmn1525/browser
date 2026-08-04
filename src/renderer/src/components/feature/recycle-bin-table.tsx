import { Button, Checkbox, Tag } from 'antd';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import type { ProfileSummary } from '../../../../shared/types';

interface RecycleBinTableProps {
  readonly busy: boolean;
  readonly onPurge: (profile: ProfileSummary) => void;
  readonly onRestore: (profile: ProfileSummary) => void;
  readonly onSelectedIdsChange: (profileIds: readonly string[]) => void;
  readonly profiles: readonly ProfileSummary[];
  readonly selectedIds: readonly string[];
}

/** 回收站表格；列宽与环境管理保持一致的固定比例，表头随内容滚动固定。 */
export function RecycleBinTable({
  busy,
  onPurge,
  onRestore,
  onSelectedIdsChange,
  profiles,
  selectedIds
}: RecycleBinTableProps): JSX.Element {
  const allSelected = profiles.length > 0 && profiles.every((profile) => selectedIds.includes(profile.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-11" />
            <col className="w-[30%]" />
            <col className="w-[24%]" />
            <col className="w-[20%]" />
            <col className="w-[188px]" />
          </colgroup>
          <thead>
            <tr>
              <Th>
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && profiles.some((profile) => selectedIds.includes(profile.id))}
                  onChange={(event) => onSelectedIdsChange(event.target.checked ? profiles.map((profile) => profile.id) : [])}
                />
              </Th>
              <Th>名称</Th>
              <Th>标签</Th>
              <Th>删除时间</Th>
              <Th className="sticky right-0 z-30 border-l bg-muted text-right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr className="hover:bg-primary/5" key={profile.id}>
                <Td>
                  <Checkbox
                    checked={selectedIds.includes(profile.id)}
                    onChange={(event) => onSelectedIdsChange(toggleId(selectedIds, profile.id, event.target.checked))}
                  />
                </Td>
                <Td><div className="min-w-0 truncate font-medium">{profile.name}</div></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {profile.tags.length > 0 ? profile.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <Tag>无标签</Tag>}
                  </div>
                </Td>
                <Td><span className="text-muted-foreground">{formatDeletedAt(profile.deletedAt)}</span></Td>
                <Td className="sticky right-0 z-10 border-l bg-card shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.55)]">
                  <div className="flex items-center justify-end gap-2">
                    <Button disabled={busy} htmlType="button" onClick={() => onRestore(profile)} size="small" type="primary">
                      <RotateCcw className="size-4" />恢复
                    </Button>
                    <Button danger disabled={busy} htmlType="button" onClick={() => onPurge(profile)} size="small">
                      <Trash2 className="size-4" />彻底删除
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toggleId(selectedIds: readonly string[], profileId: string, checked: boolean): readonly string[] {
  return checked ? [...selectedIds, profileId] : selectedIds.filter((id) => id !== profileId);
}

function formatDeletedAt(deletedAt: number | undefined): string {
  return deletedAt === undefined ? '未知' : new Date(deletedAt).toLocaleString('zh-CN');
}

function Th({ children, className }: PropsWithChildren<{ readonly className?: string }>): JSX.Element {
  return (
    <th className={['sticky top-0 z-20 border-b bg-muted px-3 py-2 text-xs font-semibold text-secondary', className].filter(Boolean).join(' ')}>
      {children}
    </th>
  );
}

function Td({ children, className }: PropsWithChildren<{ readonly className?: string }>): JSX.Element {
  return <td className={['overflow-hidden border-b px-3 py-3 align-middle', className].filter(Boolean).join(' ')}>{children}</td>;
}
